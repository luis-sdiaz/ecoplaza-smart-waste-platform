import { GoogleGenerativeAI } from "@google/generative-ai";

export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash-latest";

/**
 * Cadena ordenada de modelos candidatos compatibles con el endpoint v1beta de Google Generative AI.
 * Si el modelo configurado (o el primero de la lista) falla con 404 (Not Found) o 503 (High Demand),
 * se itera automáticamente al siguiente candidato antes de propagar la falla.
 */
export const CANDIDATE_MODELS: readonly string[] = [
  "gemini-1.5-flash-latest",
  "gemini-flash-latest",
  "gemini-pro",
];

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.modelName =
      config?.modelName ||
      (envModel && envModel.trim() !== "" ? envModel.trim() : DEFAULT_GEMINI_MODEL);
  }

  /**
   * Reconfigura dinámicamente la clave o el modelo del servicio.
   */
  public init(config?: GeminiConfig): void {
    if (config?.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config?.modelName !== undefined) {
      this.modelName = config.modelName;
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
   * Implementa una **cascada de modelos** (Model Cascade):
   * 1. Intenta con el modelo configurado (`this.modelName`).
   * 2. Si falla con 404 (Not Found) o 503 (High Demand), itera automáticamente
   *    al siguiente modelo candidato de `CANDIDATE_MODELS`.
   * 3. Para cada modelo, aplica un reintento defensivo (1 reintento con retardo
   *    de 800ms) ante errores transitorios 503/429.
   * 4. Si todos los modelos de la cascada fallan, propaga el último error.
   */
  public async generateText(
    prompt: string,
    options?: GeminiGenerateOptions,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Gemini API key no configurada en VITE_GEMINI_API_KEY");
    }

    const effectiveKey = this.getEffectiveApiKey();
    const globalProcess = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process;
    const isTestEnv =
      import.meta.env?.MODE === "test" ||
      globalProcess?.env?.NODE_ENV === "test";
    const defaultDelay = isTestEnv ? 0 : 800;
    const retryDelay = options?.retryDelayMs ?? defaultDelay;
    const maxRetries = options?.maxRetries ?? 1;
    const maxAttempts = maxRetries + 1;

    const client = new GoogleGenerativeAI(effectiveKey);

    // Construir la cadena de modelos a intentar: primero el configurado,
    // luego los candidatos restantes que no sean el ya configurado.
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

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
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

          // Si el modelo no existe (404), escalar al siguiente candidato de la cascada
          if (isModelNotFoundError(sanitized)) {
            if (import.meta.env?.DEV) {
              console.warn(
                `[Gemini AI Cascade]: Modelo "${currentModel}" no disponible (404). Intentando siguiente candidato...`,
              );
            }
            break; // Salir del bucle de reintentos, pasar al siguiente modelo
          }

          // Si es un error transitorio (503/429), reintentar con el mismo modelo
          if (isTransientGeminiError(sanitized) && attempt < maxAttempts) {
            if (import.meta.env?.DEV) {
              console.warn(
                `[Gemini AI Retry]: Error transitorio en intento ${attempt}/${maxAttempts} con "${currentModel}" (${sanitized.slice(0, 100)}). Reintentando en ${retryDelay}ms...`,
              );
            }
            if (retryDelay > 0) {
              await sleep(retryDelay);
            }
            continue;
          }

          // Si es transitorio y agotamos los reintentos, escalar al siguiente modelo
          if (isTransientGeminiError(sanitized)) {
            if (import.meta.env?.DEV) {
              console.warn(
                `[Gemini AI Cascade]: Modelo "${currentModel}" agotó reintentos por error transitorio. Intentando siguiente candidato...`,
              );
            }
            break;
          }

          // Error no recuperable (400, 401, 403): propagar directamente sin cascada
          break;
        }
      }

      // Si el último error NO fue 404 ni transitorio, no tiene sentido probar otro modelo
      if (lastError) {
        const rawMsg = lastError instanceof Error ? lastError.message : String(lastError);
        const san = sanitizeErrorMessage(rawMsg, effectiveKey);
        if (!isModelNotFoundError(san) && !isTransientGeminiError(san)) {
          break;
        }
      }
    }

    // Clasificar y propagar el último error con mensaje descriptivo
    const rawMessage =
      lastError instanceof Error ? lastError.message : String(lastError);
    const sanitized = sanitizeErrorMessage(rawMessage, effectiveKey);

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