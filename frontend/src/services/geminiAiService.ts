import { GoogleGenerativeAI } from "@google/generative-ai";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const GEMINI_REQUEST_TIMEOUT_MS = 3500;

/**
 * Cadena ordenada de modelos candidatos compatibles con el endpoint v1beta de Google Generative AI.
 * Prioriza "gemini-3.8-flash" y el alias dinámico "gemini-flash-latest", erradicando modelos descontinuados o con error 404.
 */
export const CANDIDATE_MODELS: readonly string[] = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

/**
 * Sanitiza y normaliza identificadores de modelos de Gemini para el endpoint v1beta.
 * Preserva "gemini-3.8-flash" y "gemini-flash-latest", y mapea alias obsoletos o descontinuados ("gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro") a DEFAULT_GEMINI_MODEL.
 */
export function normalizeGeminiModelName(modelName?: string): string {
  if (!modelName || typeof modelName !== "string") {
    return DEFAULT_GEMINI_MODEL;
  }
  const trimmed = modelName.trim().replace(/^["']|["']$/g, "").trim();
  if (!trimmed) {
    return DEFAULT_GEMINI_MODEL;
  }
  if (trimmed === "gemini-3.8-flash" || trimmed === "gemini-flash-latest") {
    return trimmed;
  }
  return DEFAULT_GEMINI_MODEL;
}

export interface GeminiConfig {
  apiKey?: string;
  modelName?: string;
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Determina si un error retornado por la API o el SDK de Gemini es de naturaleza transitoria
 * (HTTP 503 por saturación/alta demanda o HTTP 429 por límite temporal de tasa/cuota).
 */
function isTransientGeminiError(message: string): boolean {
  return (
    message.includes("503") ||
    message.includes("429") ||
    /high demand/i.test(message) ||
    /service unavailable/i.test(message) ||
    /overloaded/i.test(message) ||
    /quota|exhausted/i.test(message) ||
    /too many requests/i.test(message) ||
    /resource has been exhausted/i.test(message)
  );
}

/**
 * Determina si el error corresponde a un modelo no encontrado o no disponible (HTTP 404),
 * lo que permite escalar al siguiente modelo candidato en la cascada.
 */
function isModelNotFoundError(message: string): boolean {
  return (
    message.includes("404") ||
    /not found/i.test(message) ||
    /no longer available/i.test(message) ||
    /is not found for API version/i.test(message) ||
    /not supported for generateContent/i.test(message)
  );
}

/**
 * Enmascara credenciales y tokens sensibles presentes en cadenas de error
 * para prevenir fugas de información confidencial en logs o interfaces.
 */
function sanitizeErrorMessage(message: string, apiKey?: string): string {
  let sanitized = message;
  if (apiKey && apiKey.trim().length > 0) {
    sanitized = sanitized.split(apiKey.trim()).join("[REDACTED_API_KEY]");
  }
  // Enmascarar parámetros en URLs tipo ?key=... o key=...
  sanitized = sanitized.replace(/key=[a-zA-Z0-9_-]+/gi, "key=[REDACTED_API_KEY]");
  // Enmascarar patrones de clave de Google AI Studio (AIza...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z_-]{35}/g, "[REDACTED_API_KEY]");
  return sanitized;
}

export class GeminiAiService {
  private apiKey?: string;
  private modelName: string;

  constructor(config?: GeminiConfig) {
    this.apiKey = config?.apiKey;
    const envModel = import.meta.env?.VITE_GEMINI_MODEL as string | undefined;
    const rawModel =
      config?.modelName ||
      (envModel && envModel.trim() !== "" ? envModel.trim() : DEFAULT_GEMINI_MODEL);
    this.modelName = normalizeGeminiModelName(rawModel);
  }

  /**
   * Reconfigura dinámicamente la clave o el modelo del servicio.
   */
  public init(config?: GeminiConfig): void {
    if (config?.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config?.modelName !== undefined) {
      this.modelName = normalizeGeminiModelName(config.modelName);
    }
  }

  public configure(config: GeminiConfig): void {
    this.init(config);
  }

  /**
   * Obtiene la clave efectiva considerando la configuración local o la variable de entorno,
   * normalizando y removiendo posibles comillas envolventes accidentales.
   */
  public getEffectiveApiKey(): string {
    const candidate =
      this.apiKey ??
      (import.meta.env?.VITE_GEMINI_API_KEY as string | undefined) ??
      "";
    if (typeof candidate !== "string") return "";
    return candidate.trim().replace(/^["']|["']$/g, "").trim();
  }

  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Verifica si existe una API key válida configurada y no vacía.
   */
  public isConfigured(): boolean {
    const envKey = (import.meta.env?.VITE_GEMINI_API_KEY as string | undefined) ?? "";
    const activeKey = this.apiKey !== undefined ? this.apiKey : envKey;
    return Boolean(
      activeKey &&
        typeof activeKey === "string" &&
        activeKey.trim().replace(/^["']|["']$/g, "").trim() !== "",
    );
  }

  /**
   * Genera texto mediante el modelo de Gemini oficial configurado.
   *
   * Arquitectura tolerante a fallos:
   * 1. Cascada restringida a modelos Flash ("gemini-3.8-flash" y "gemini-flash-latest")
   *    para evitar errores de cuota (HTTP 429) en Free Tier.
   * 2. Timeout estricto de 3500ms con AbortController para garantizar respuesta inmediata.
   * 3. Ante HTTP 429 (Quota Exceeded), 503 (Saturación) o Timeout, aborta de inmediato
   *    la cascada externa sin reintentos bloqueantes para conmutar al motor local heurístico.
   * 4. Ante HTTP 404 (modelo no encontrado), escala al siguiente candidato Flash.
   */
  public async generateText(
    prompt: string,
    options?: GeminiGenerateOptions,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Gemini API key no configurada en VITE_GEMINI_API_KEY");
    }

    const effectiveKey = this.getEffectiveApiKey();
    const timeoutMs = options?.timeoutMs ?? GEMINI_REQUEST_TIMEOUT_MS;
    const client = new GoogleGenerativeAI(effectiveKey);

    // Construir la cadena de modelos Flash a intentar: primero el configurado,
    // luego los candidatos restantes de CANDIDATE_MODELS.
    const modelsToTry: string[] = [this.modelName];
    for (const candidate of CANDIDATE_MODELS) {
      if (!modelsToTry.includes(candidate)) {
        modelsToTry.push(candidate);
      }
    }

    const baseModelParams: {
      systemInstruction?: string;
      generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
      };
    } = {};

    if (options?.systemInstruction) {
      baseModelParams.systemInstruction = options.systemInstruction;
    }

    if (
      options?.temperature !== undefined ||
      options?.maxOutputTokens !== undefined
    ) {
      baseModelParams.generationConfig = {};
      if (options.temperature !== undefined) {
        baseModelParams.generationConfig.temperature = options.temperature;
      }
      if (options.maxOutputTokens !== undefined) {
        baseModelParams.generationConfig.maxOutputTokens = options.maxOutputTokens;
      }
    }

    let lastError: unknown;

    for (const currentModel of modelsToTry) {
      const modelParams = { model: currentModel, ...baseModelParams };
      const model = client.getGenerativeModel(modelParams);

      const abortController = new AbortController();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          abortController.abort();
          reject(
            new Error(
              `Tiempo de espera agotado al consultar Gemini (${timeoutMs}ms)`,
            ),
          );
        }, timeoutMs);
      });

      try {
        const generatePromise = (async () => {
          const result = await model.generateContent(prompt);
          return await result.response;
        })();

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = typeof response?.text === "function" ? response.text() : "";

        // Éxito: actualizar el modelo efectivo para las próximas llamadas en esta sesión
        if (currentModel !== this.modelName) {
          if (import.meta.env?.DEV) {
            console.info(
              `[Gemini AI Cascade]: Modelo resuelto exitosamente con "${currentModel}" (original: "${this.modelName}").`,
            );
          }
          this.modelName = currentModel;
        }
        return text;
      } catch (error: unknown) {
        lastError = error;
        const rawMessage = error instanceof Error ? error.message : String(error);
        const sanitized = sanitizeErrorMessage(rawMessage, effectiveKey);

        // 1. Ante HTTP 429 (cuota), HTTP 503 (saturación) o Timeout:
        // Abortar de inmediato sin reintentos para conmutación instantánea al motor local
        if (
          isTransientGeminiError(sanitized) ||
          sanitized.includes("429") ||
          sanitized.includes("503") ||
          /tiempo de espera agotado|timeout/i.test(sanitized)
        ) {
          if (import.meta.env?.DEV) {
            console.warn(
              `[Gemini AI Abort]: Error transitorio, cuota o timeout (${sanitized.slice(0, 100)}). Abortando cascada externa para conmutación local inmediata.`,
            );
          }
          break;
        }

        // 2. Si el modelo no existe (404), escalar al siguiente candidato Flash de la cascada
        if (isModelNotFoundError(sanitized)) {
          if (import.meta.env?.DEV) {
            console.warn(
              `[Gemini AI Cascade]: Modelo "${currentModel}" no disponible (404). Intentando siguiente candidato Flash...`,
            );
          }
          continue;
        }

        // 3. Error no recuperable (400, 401, 403): abortar directamente
        break;
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    }

    // Clasificar y propagar el último error con mensaje descriptivo
    const rawMessage =
      lastError instanceof Error ? lastError.message : String(lastError);
    const sanitized = sanitizeErrorMessage(rawMessage, effectiveKey);

    if (/tiempo de espera agotado|timeout/i.test(sanitized)) {
      throw new Error(
        `Tiempo de espera agotado al consultar Gemini (${timeoutMs}ms)`,
        { cause: lastError },
      );
    }
    if (
      sanitized.includes("503") ||
      /high demand|service unavailable|overloaded/i.test(sanitized)
    ) {
      throw new Error(
        `Servicio de Gemini saturado o no disponible (503): ${sanitized}`,
        { cause: lastError },
      );
    }
    if (sanitized.includes("429") || /quota|exhausted/i.test(sanitized)) {
      throw new Error(`Cuota de Gemini excedida (429): ${sanitized}`, {
        cause: lastError,
      });
    }
    if (sanitized.includes("400") || /invalid/i.test(sanitized)) {
      throw new Error(
        `Solicitud inválida a la API de Gemini (400): ${sanitized}`,
        { cause: lastError },
      );
    }
    if (
      sanitized.includes("401") ||
      sanitized.includes("403") ||
      /API_KEY_INVALID|unauthorized|forbidden/i.test(sanitized)
    ) {
      throw new Error(
        `Error de autenticación con la API de Gemini: ${sanitized}`,
        { cause: lastError },
      );
    }
    if (
      sanitized.includes("404") ||
      /not found|no longer available/i.test(sanitized)
    ) {
      throw new Error(
        `Ningún modelo de la cascada Gemini está disponible (404): ${sanitized}`,
        { cause: lastError },
      );
    }

    throw new Error(`Error al generar texto con Gemini: ${sanitized}`, {
      cause: lastError,
    });
  }
}

export const geminiAiService = new GeminiAiService();
export default geminiAiService;