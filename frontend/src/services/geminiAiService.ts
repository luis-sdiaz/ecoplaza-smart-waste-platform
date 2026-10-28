import { GoogleGenerativeAI } from "@google/generative-ai";

export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export interface GeminiConfig {
  apiKey?: string;
  modelName?: string;
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
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
    this.modelName = config?.modelName || DEFAULT_GEMINI_MODEL;
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
   * Obtiene la clave efectiva considerando la configuración local o la variable de entorno.
   */
  public getEffectiveApiKey(): string {
    const candidate =
      this.apiKey ??
      (import.meta.env?.VITE_GEMINI_API_KEY as string | undefined) ??
      "";
    return typeof candidate === "string" ? candidate.trim() : "";
  }

  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Verifica si existe una API key válida configurada y no vacía.
   */
  public isConfigured(): boolean {
    return this.getEffectiveApiKey().length > 0;
  }

  /**
   * Genera texto mediante el modelo de Gemini oficial configurado.
   */
  public async generateText(
    prompt: string,
    options?: GeminiGenerateOptions,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Gemini API key no configurada en VITE_GEMINI_API_KEY");
    }

    const effectiveKey = this.getEffectiveApiKey();

    try {
      const client = new GoogleGenerativeAI(effectiveKey);

      const modelParams: {
        model: string;
        systemInstruction?: string;
        generationConfig?: {
          temperature?: number;
          maxOutputTokens?: number;
        };
      } = {
        model: this.modelName,
      };

      if (options?.systemInstruction) {
        modelParams.systemInstruction = options.systemInstruction;
      }

      if (
        options?.temperature !== undefined ||
        options?.maxOutputTokens !== undefined
      ) {
        modelParams.generationConfig = {};
        if (options.temperature !== undefined) {
          modelParams.generationConfig.temperature = options.temperature;
        }
        if (options.maxOutputTokens !== undefined) {
          modelParams.generationConfig.maxOutputTokens = options.maxOutputTokens;
        }
      }

      const model = client.getGenerativeModel(modelParams);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = typeof response?.text === "function" ? response.text() : "";
      return text;
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitized = sanitizeErrorMessage(rawMessage, effectiveKey);

      if (sanitized.includes("429") || /quota|exhausted/i.test(sanitized)) {
        throw new Error(`Cuota de Gemini excedida (429): ${sanitized}`, {
          cause: error,
        });
      }
      if (sanitized.includes("400") || /invalid/i.test(sanitized)) {
        throw new Error(
          `Solicitud inválida a la API de Gemini (400): ${sanitized}`,
          { cause: error },
        );
      }
      if (
        sanitized.includes("401") ||
        sanitized.includes("403") ||
        /API_KEY_INVALID|unauthorized|forbidden/i.test(sanitized)
      ) {
        throw new Error(
          `Error de autenticación con la API de Gemini: ${sanitized}`,
          { cause: error },
        );
      }

      throw new Error(`Error al generar texto con Gemini: ${sanitized}`, {
        cause: error,
      });
    }
  }
}

export const geminiAiService = new GeminiAiService();
export default geminiAiService;