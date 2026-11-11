import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
const PROMPT_LIMIT = 4_000;
const SYSTEM_INSTRUCTION_LIMIT = 40_000;
const REQUESTS_PER_WINDOW = 12;
const RATE_WINDOW_MS = 60_000;
const PROVIDER_TIMEOUT_MS = 12_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

type ErrorCode =
  | "not_configured"
  | "auth_required"
  | "invalid_credentials"
  | "model_unavailable"
  | "quota_exceeded"
  | "provider_unavailable"
  | "timeout"
  | "rate_limited"
  | "invalid_request"
  | "malformed_response"
  | "unknown";

interface RequestBody {
  prompt?: unknown;
  systemInstruction?: unknown;
  temperature?: unknown;
  maxOutputTokens?: unknown;
}

interface RateBucket {
  startedAt: number;
  count: number;
}

const rateBuckets = new Map<string, RateBucket>();

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  retryable = false,
  diagnostics?: { providerStatus?: number; model?: string },
): Response {
  return jsonResponse(
    { ok: false, error: { code, message, retryable, ...diagnostics } },
    status,
  );
}

function getPublishableKey(): string {
  const keysJson = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keysJson) {
    try {
      const keys = JSON.parse(keysJson) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // Continue with the legacy environment variable when present.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function consumeRateLimit(userId: string): boolean {
  const now = Date.now();
  const current = rateBuckets.get(userId);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function readModels(): string[] {
  const configured = Deno.env.get("GEMINI_MODELS")
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return configured?.length ? [...new Set(configured)].slice(0, 3) : DEFAULT_MODELS;
}

function classifyProviderError(status: number): {
  code: ErrorCode;
  status: number;
  retryable: boolean;
} {
  if (status === 400) return { code: "invalid_request", status: 400, retryable: false };
  if (status === 401 || status === 403) {
    return { code: "invalid_credentials", status: 502, retryable: false };
  }
  if (status === 404) return { code: "model_unavailable", status: 503, retryable: true };
  if (status === 429) return { code: "quota_exceeded", status: 503, retryable: true };
  if (status === 500) {
    return { code: "provider_unavailable", status: 503, retryable: true };
  }
  if (status === 503 || status === 504) {
    return { code: "provider_unavailable", status: 503, retryable: true };
  }
  return { code: "unknown", status: 502, retryable: status >= 500 };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return errorResponse(405, "invalid_request", "Método no permitido.");
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return errorResponse(401, "auth_required", "Sesión requerida.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !publishableKey) {
    return errorResponse(503, "not_configured", "Autenticación del servidor no configurada.");
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return errorResponse(401, "auth_required", "Sesión inválida.");
  if (!consumeRateLimit(user.id)) {
    return errorResponse(429, "rate_limited", "Demasiadas solicitudes. Intenta de nuevo en un minuto.", true);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse(400, "invalid_request", "El cuerpo JSON no es válido.");
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const systemInstruction =
    typeof body.systemInstruction === "string" ? body.systemInstruction.trim() : "";
  if (!prompt || prompt.length > PROMPT_LIMIT) {
    return errorResponse(400, "invalid_request", "La consulta está vacía o excede el límite permitido.");
  }
  if (systemInstruction.length > SYSTEM_INSTRUCTION_LIMIT) {
    return errorResponse(400, "invalid_request", "El contexto operacional excede el límite permitido.");
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!geminiApiKey) {
    return errorResponse(503, "not_configured", "Gemini no está configurado en el servidor.");
  }

  const temperature =
    typeof body.temperature === "number" && body.temperature >= 0 && body.temperature <= 2
      ? body.temperature
      : 0.2;
  const maxOutputTokens =
    typeof body.maxOutputTokens === "number" &&
    Number.isInteger(body.maxOutputTokens) &&
    body.maxOutputTokens >= 64 &&
    body.maxOutputTokens <= 2_048
      ? body.maxOutputTokens
      : 1_024;

  let lastFailure = { code: "model_unavailable" as ErrorCode, status: 503, retryable: true };
  let lastModel = readModels()[0] ?? "unknown";
  let lastProviderStatus = 404;
  const startedAt = performance.now();

  for (const model of readModels()) {
    lastModel = model;
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            ...(systemInstruction
              ? { system_instruction: { parts: [{ text: systemInstruction }] } }
              : {}),
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens },
          }),
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        lastFailure = classifyProviderError(response.status);
        lastProviderStatus = response.status;
        console.warn(
          `[gemini-assistant] provider_failure status=${response.status} model=${model}`,
        );
        if (response.status === 404 || response.status === 503 || response.status === 504) {
          continue;
        }
        break;
      }

      const providerBody = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      };
      const text = providerBody.candidates?.[0]?.content?.parts
        ?.map((part) => typeof part.text === "string" ? part.text : "")
        .join("")
        .trim();
      if (!text) {
        lastFailure = { code: "malformed_response", status: 502, retryable: false };
        break;
      }

      return jsonResponse({
        ok: true,
        provider: "gemini",
        text,
        model,
        latencyMs: Math.round(performance.now() - startedAt),
      }, 200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        lastFailure = { code: "timeout", status: 504, retryable: true };
        lastProviderStatus = 504;
        console.warn(`[gemini-assistant] provider_timeout model=${model}`);
        continue;
      }
      lastFailure = { code: "provider_unavailable", status: 503, retryable: true };
      lastProviderStatus = 0;
      console.warn(`[gemini-assistant] provider_network_failure model=${model}`);
      continue;
    }
  }

  const safeMessages: Record<ErrorCode, string> = {
    not_configured: "Gemini no está configurado.",
    auth_required: "Sesión requerida.",
    invalid_credentials: "Credencial del proveedor inválida.",
    model_unavailable: "No hay un modelo compatible disponible.",
    quota_exceeded: "La cuota del proveedor está agotada.",
    provider_unavailable: "El proveedor no está disponible temporalmente.",
    timeout: "El proveedor agotó el tiempo de espera.",
    rate_limited: "Límite de solicitudes alcanzado.",
    invalid_request: "Solicitud inválida.",
    malformed_response: "Respuesta incompleta del proveedor.",
    unknown: "Error inesperado del proveedor.",
  };
  return errorResponse(
    lastFailure.status,
    lastFailure.code,
    safeMessages[lastFailure.code],
    lastFailure.retryable,
    {
      ...(lastProviderStatus > 0 ? { providerStatus: lastProviderStatus } : {}),
      model: lastModel,
    },
  );
});
