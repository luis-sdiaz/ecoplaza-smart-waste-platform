export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const GEMINI_REQUEST_TIMEOUT_MS = 28_000;
export const GEMINI_FUNCTION_NAME = "gemini-assistant";

export type GeminiErrorCode =
  | "not_configured"
  | "auth_required"
  | "invalid_credentials"
  | "model_unavailable"
  | "quota_exceeded"
  | "provider_unavailable"
  | "timeout"
  | "network_error"
  | "cancelled"
  | "rate_limited"
  | "invalid_request"
  | "malformed_response"
  | "unknown";

export interface GeminiConfig {
  enabled?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GeminiGenerationMetadata {
  model: string;
  latencyMs: number;
}

interface EdgeSuccessResponse {
  ok: true;
  provider: "gemini";
  text: string;
  model: string;
  latencyMs: number;
}

interface EdgeErrorResponse {
  ok?: false;
  error?: {
    code?: GeminiErrorCode;
    retryable?: boolean;
    providerStatus?: number;
    model?: string;
  };
}

const USER_MESSAGES: Record<GeminiErrorCode, string> = {
  not_configured: "El servicio de Gemini no está configurado en el servidor.",
  auth_required: "Debes iniciar sesión para utilizar Gemini.",
  invalid_credentials: "La credencial de Gemini del servidor no es válida.",
  model_unavailable: "El modelo de Gemini no está disponible.",
  quota_exceeded: "La cuota de Gemini está agotada temporalmente.",
  provider_unavailable: "Gemini no está disponible temporalmente.",
  timeout: "Gemini tardó demasiado en responder.",
  network_error: "No fue posible conectar con el servicio de IA.",
  cancelled: "La solicitud a Gemini fue cancelada.",
  rate_limited: "Se alcanzó el límite temporal de consultas al asistente.",
  invalid_request: "La consulta no cumple los límites del asistente.",
  malformed_response: "Gemini devolvió una respuesta incompleta.",
  unknown: "Ocurrió un error inesperado al consultar Gemini.",
};

export class GeminiServiceError extends Error {
  public readonly code: GeminiErrorCode;
  public readonly status?: number;
  public readonly retryable: boolean;
  public readonly providerStatus?: number;
  public readonly model?: string;

  constructor(
    code: GeminiErrorCode,
    options?: {
      status?: number;
      retryable?: boolean;
      providerStatus?: number;
      model?: string;
      cause?: unknown;
    },
  ) {
    super(USER_MESSAGES[code], { cause: options?.cause });
    this.name = "GeminiServiceError";
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
    this.providerStatus = options?.providerStatus;
    this.model = options?.model;
  }
}

function isEdgeSuccessResponse(value: unknown): value is EdgeSuccessResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EdgeSuccessResponse>;
  return (
    candidate.ok === true &&
    candidate.provider === "gemini" &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length > 0 &&
    typeof candidate.model === "string" &&
    candidate.model.trim().length > 0 &&
    typeof candidate.latencyMs === "number"
  );
}

function toErrorCode(status: number, body: EdgeErrorResponse): GeminiErrorCode {
  const serverCode = body.error?.code;
  if (serverCode && serverCode in USER_MESSAGES) return serverCode;
  if (status === 400) return "invalid_request";
  if (status === 401 || status === 403) return "auth_required";
  if (status === 429) return "rate_limited";
  if (status === 404) return "model_unavailable";
  if (status === 504) return "timeout";
  if (status === 500 || status === 502 || status === 503) {
    return "provider_unavailable";
  }
  return "unknown";
}

async function getCurrentAccessToken(): Promise<string | null> {
  try {
    const { supabase } = await import("../lib/supabase.ts");
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    // Auth/storage failures should be reported as a missing session without
    // leaking storage details or preventing safe provider diagnostics.
    return null;
  }
}

export class GeminiAiService {
  private enabled: boolean;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;
  private getAccessToken: () => Promise<string | null>;
  private lastMetadata: GeminiGenerationMetadata | null = null;

  constructor(config: GeminiConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.timeoutMs = config.timeoutMs ?? GEMINI_REQUEST_TIMEOUT_MS;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.getAccessToken = config.getAccessToken ?? getCurrentAccessToken;
  }

  public configure(config: GeminiConfig): void {
    if (config.enabled !== undefined) this.enabled = config.enabled;
    if (config.timeoutMs !== undefined) this.timeoutMs = config.timeoutMs;
    if (config.fetchImpl !== undefined) this.fetchImpl = config.fetchImpl;
    if (config.getAccessToken !== undefined) {
      this.getAccessToken = config.getAccessToken;
    }
  }

  public init(config: GeminiConfig = {}): void {
    this.configure(config);
  }

  public isConfigured(): boolean {
    return this.enabled;
  }

  public getModelName(): string {
    return this.lastMetadata?.model ?? DEFAULT_GEMINI_MODEL;
  }

  public getLastMetadata(): GeminiGenerationMetadata | null {
    return this.lastMetadata;
  }

  public async generateText(
    prompt: string,
    options: GeminiGenerateOptions = {},
  ): Promise<string> {
    this.lastMetadata = null;
    if (!this.enabled) throw new GeminiServiceError("not_configured");
    if (options.signal?.aborted) throw new GeminiServiceError("cancelled");

    let accessToken: string | null;
    try {
      accessToken = await this.getAccessToken();
    } catch (error) {
      throw new GeminiServiceError("auth_required", {
        status: 401,
        cause: error,
      });
    }
    if (!accessToken) {
      throw new GeminiServiceError("auth_required", { status: 401 });
    }
    if (options.signal?.aborted) throw new GeminiServiceError("cancelled");

    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL?.trim() ?? "";
    const supabasePublishableKey =
      import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new GeminiServiceError("not_configured");
    }

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort("cancelled");
    options.signal?.addEventListener("abort", onExternalAbort, { once: true });
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeoutHandle = setTimeout(
      () => controller.abort("timeout"),
      timeoutMs,
    );

    try {
      // Native Window.fetch rejects a GeminiAiService receiver in WebView2.
      // Call the transport as a function so WebIDL uses the global receiver.
      const fetchRequest = this.fetchImpl;
      const response = await fetchRequest(
        `${supabaseUrl}/functions/v1/${GEMINI_FUNCTION_NAME}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: supabasePublishableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            systemInstruction: options.systemInstruction,
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
          }),
          signal: controller.signal,
        },
      );

      let body: EdgeSuccessResponse | EdgeErrorResponse;
      try {
        body = (await response.json()) as EdgeSuccessResponse | EdgeErrorResponse;
      } catch (error) {
        throw new GeminiServiceError("malformed_response", {
          status: response.status,
          cause: error,
        });
      }

      if (!response.ok) {
        const code = toErrorCode(response.status, body as EdgeErrorResponse);
        throw new GeminiServiceError(code, {
          status: response.status,
          retryable: (body as EdgeErrorResponse).error?.retryable,
          providerStatus: (body as EdgeErrorResponse).error?.providerStatus,
          model: (body as EdgeErrorResponse).error?.model,
        });
      }
      if (!isEdgeSuccessResponse(body)) {
        throw new GeminiServiceError("malformed_response", {
          status: response.status,
        });
      }

      this.lastMetadata = { model: body.model, latencyMs: body.latencyMs };
      return body.text.trim();
    } catch (error) {
      if (error instanceof GeminiServiceError) throw error;
      if (controller.signal.aborted) {
        const code = options.signal?.aborted ? "cancelled" : "timeout";
        throw new GeminiServiceError(code, { cause: error });
      }
      throw new GeminiServiceError("network_error", {
        retryable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutHandle);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
  }
}

export const geminiAiService = new GeminiAiService();
export default geminiAiService;
