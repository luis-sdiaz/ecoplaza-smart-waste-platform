import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_FUNCTION_NAME,
  GEMINI_REQUEST_TIMEOUT_MS,
  GeminiAiService,
  GeminiServiceError,
  geminiAiService,
} from "../src/services/geminiAiService.ts";

const accessToken = async () => "user-session-jwt";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successfulFetch(model = "gemini-3.5-flash-lite") {
  return vi.fn(
    async (...args: Parameters<typeof fetch>) => {
      void args;
      return jsonResponse({
        ok: true,
        provider: "gemini",
        text: "Respuesta real del proxy",
        model,
        latencyMs: 1234,
      });
    },
  );
}

describe("GeminiAiService - proxy seguro de Supabase Edge Functions", () => {
  it("invoca fetch con un receptor válido de navegador y WebView2", async () => {
    // WebIDL rejects a native Window.fetch call whose receiver is the service.
    // Node's fetch and arrow-function mocks do not enforce that browser rule.
    vi.stubGlobal("fetch", async function (this: unknown) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }
      return jsonResponse({
        ok: true,
        provider: "gemini",
        text: "Respuesta del proxy autenticado",
        model: "gemini-3.5-flash-lite",
        latencyMs: 20,
      });
    });

    try {
      const service = new GeminiAiService({ getAccessToken: accessToken });
      await expect(service.generateText("Consulta desde Tauri")).resolves.toBe(
        "Respuesta del proxy autenticado",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("usa el proxy autenticado y conserva metadatos verificables del proveedor", async () => {
    const fetchImpl = successfulFetch();
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
    });

    const result = await service.generateText("Estado de EcoPlaza", {
      systemInstruction: "Contexto operacional mínimo",
      temperature: 0.2,
      maxOutputTokens: 512,
    });

    expect(result).toBe("Respuesta real del proxy");
    expect(service.getLastMetadata()).toEqual({
      model: "gemini-3.5-flash-lite",
      latencyMs: 1234,
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain(`/functions/v1/${GEMINI_FUNCTION_NAME}`);
    expect(String(url)).not.toContain("generativelanguage.googleapis.com");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer user-session-jwt",
    });
  });

  it("no intenta la red sin una sesión autenticada", async () => {
    const fetchImpl = successfulFetch();
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => null,
    });

    await expect(service.generateText("Hola")).rejects.toMatchObject({
      code: "auth_required",
      status: 401,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("clasifica un fallo al leer la sesión como auth_required sin filtrar detalles", async () => {
    const fetchImpl = successfulFetch();
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => {
        throw new Error("secure storage details");
      },
    });

    await expect(service.generateText("Hola")).rejects.toMatchObject({
      code: "auth_required",
      status: 401,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("diferencia configuración ausente sin conservar una clave cliente", async () => {
    const service = new GeminiAiService({ enabled: false });
    await expect(service.generateText("Hola")).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it.each([
    [404, "model_unavailable"],
    [503, "quota_exceeded"],
    [503, "model_unavailable"],
    [503, "provider_unavailable"],
    [504, "timeout"],
    [502, "invalid_credentials"],
    [429, "rate_limited"],
  ] as const)("propaga el error estructurado %s/%s", async (status, code) => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: false, error: { code, retryable: true } }, status),
    );
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
    });

    await expect(service.generateText("Consulta")).rejects.toMatchObject({
      code,
      status,
    });
  });

  it("conserva el estado HTTP real y el modelo del proveedor en el diagnóstico", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          ok: false,
          error: {
            code: "provider_unavailable",
            retryable: true,
            providerStatus: 500,
            model: "gemini-3.8-flash",
          },
        },
        503,
      ),
    );
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
    });

    await expect(service.generateText("Consulta")).rejects.toMatchObject({
      code: "provider_unavailable",
      status: 503,
      providerStatus: 500,
      model: "gemini-3.8-flash",
    });
  });

  it("cancela realmente la petición al alcanzar el timeout", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
      timeoutMs: 10,
    });

    await expect(service.generateText("Consulta lenta")).rejects.toMatchObject({
      code: "timeout",
    });
    expect((fetchImpl.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });

  it("diferencia una cancelación voluntaria de un timeout", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
    });
    const request = service.generateText("Consulta", { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ code: "cancelled" });
  });

  it("rechaza respuestas exitosas vacías o malformadas", async () => {
    const service = new GeminiAiService({
      fetchImpl: (async () =>
        jsonResponse({ ok: true, provider: "gemini", text: "", model: "x", latencyMs: 1 })) as typeof fetch,
      getAccessToken: accessToken,
    });

    await expect(service.generateText("Consulta")).rejects.toMatchObject({
      code: "malformed_response",
    });
  });

  it("clasifica fallos de red sin filtrar detalles internos", async () => {
    const service = new GeminiAiService({
      fetchImpl: (async () => {
        throw new Error("socket failed with internal details");
      }) as typeof fetch,
      getAccessToken: accessToken,
    });

    try {
      await service.generateText("Consulta");
      expect.fail("La solicitud debía fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiServiceError);
      expect(error).toMatchObject({ code: "network_error" });
      expect((error as Error).message).not.toContain("internal details");
    }
  });

  it("nunca envía una credencial privada de Gemini desde el cliente", async () => {
    const fetchImpl = successfulFetch(DEFAULT_GEMINI_MODEL);
    const service = new GeminiAiService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: accessToken,
    });

    await service.generateText("Consulta");
    const serializedRequest = JSON.stringify(fetchImpl.mock.calls);
    expect(serializedRequest).not.toContain("x-goog-api-key");
    expect(serializedRequest).not.toContain("generativelanguage.googleapis.com");
  });

  it("expone un timeout razonable y mantiene disponible el singleton", () => {
    expect(GEMINI_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(20_000);
    expect(geminiAiService).toBeInstanceOf(GeminiAiService);
    expect(new GeminiAiService().getModelName()).toBe(DEFAULT_GEMINI_MODEL);
  });
});
