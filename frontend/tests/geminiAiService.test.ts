import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANDIDATE_MODELS,
  DEFAULT_GEMINI_MODEL,
  GeminiAiService,
  geminiAiService,
  type GeminiGenerateOptions,
} from "../src/services/geminiAiService.ts";

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();
const mockGoogleGenerativeAI = vi.fn();

vi.mock("@google/generative-ai", () => {
  class GoogleGenerativeAI {
    constructor(apiKey: string) {
      mockGoogleGenerativeAI(apiKey);
    }

    getGenerativeModel(params: unknown) {
      mockGetGenerativeModel(params);
      return {
        generateContent: mockGenerateContent,
      };
    }
  }

  return { GoogleGenerativeAI };
});

describe("GeminiAiService - Infraestructura y Servicio Oficial de IA Generativa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockReset();
    mockGoogleGenerativeAI.mockReset();

    // Comportamiento exitoso por defecto
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "Mocked AI Response",
      },
    });
  });

  it("1. Debe reportar isConfigured() === false si la API key está ausente o vacía", () => {
    const serviceDefault = new GeminiAiService();
    expect(serviceDefault.isConfigured()).toBe(false);

    const serviceEmpty = new GeminiAiService({ apiKey: "" });
    expect(serviceEmpty.isConfigured()).toBe(false);

    const serviceWhitespace = new GeminiAiService({ apiKey: "    " });
    expect(serviceWhitespace.isConfigured()).toBe(false);
  });

  it("2. Debe reportar isConfigured() === true cuando se inicializa con una API key válida", () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyTestValidKey_12345" });
    expect(service.isConfigured()).toBe(true);
    expect(service.getEffectiveApiKey()).toBe("AIzaSyTestValidKey_12345");
  });

  it("3. Debe rechazar con error descriptivo si se intenta generateText sin clave configurada", async () => {
    const service = new GeminiAiService({ apiKey: "" });

    await expect(service.generateText("Hola")).rejects.toThrow(
      "Gemini API key no configurada en VITE_GEMINI_API_KEY",
    );
    expect(mockGoogleGenerativeAI).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("4. Debe inicializar el cliente Gemini y retornar el texto esperado en una llamada exitosa", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyTestKey-Valid-987" });
    const prompt = "¿Cuáles son las mejores prácticas para reciclar plástico PET?";

    const response = await service.generateText(prompt);

    expect(mockGoogleGenerativeAI).toHaveBeenCalledTimes(1);
    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith("AIzaSyTestKey-Valid-987");

    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: DEFAULT_GEMINI_MODEL,
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(prompt);

    expect(response).toBe("Mocked AI Response");
  });

  it("5. Debe pasar correctamente las instrucciones de sistema (systemInstruction) al modelo cuando se suministran en las opciones", async () => {
    const service = new GeminiAiService({ apiKey: "test-api-key" });
    const options: GeminiGenerateOptions = {
      systemInstruction:
        "Actúa como asistente ambiental experto para la plataforma EcoPlaza en Pasto, Nariño.",
      temperature: 0.2,
      maxOutputTokens: 1024,
    };

    await service.generateText("Resumen de residuos", options);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: DEFAULT_GEMINI_MODEL,
      systemInstruction:
        "Actúa como asistente ambiental experto para la plataforma EcoPlaza en Pasto, Nariño.",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });
  });

  it("6. Debe capturar y propagar de forma segura un fallo del SDK/API sin exponer tokens", async () => {
    const secretKey = "AIzaSySuperSecretKeyLeakAttempt99";
    const service = new GeminiAiService({ apiKey: secretKey });

    mockGenerateContent.mockRejectedValue(
      new Error(
        `Failed to fetch from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${secretKey}: Network connection failed`,
      ),
    );

    try {
      await service.generateText("Consulta con fallo");
      expect.fail("Debería haber lanzado un error");
    } catch (err: unknown) {
      const error = err as Error;
      // Verificación de sanitización: el token jamás debe aparecer en el mensaje del error
      expect(error.message).not.toContain(secretKey);
      expect(error.message).toContain("[REDACTED_API_KEY]");
      expect(error.message).toContain("Error al generar texto con Gemini");
    }
  });

  it("7. Maneja específicamente errores de cuota agotada (429 ResourceExhausted)", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyQuotaKey" });

    mockGenerateContent.mockRejectedValue(
      new Error("[GoogleGenerativeAI Error]: [429 Too Many Requests] Resource has been exhausted"),
    );

    await expect(service.generateText("Consulta")).rejects.toThrow(
      /Cuota de Gemini excedida \(429\)/i,
    );
  });

  it("8. Maneja específicamente errores de solicitud inválida (400 InvalidArgument)", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyInvalidKey" });

    mockGenerateContent.mockRejectedValue(
      new Error("[GoogleGenerativeAI Error]: [400 Bad Request] Invalid argument"),
    );

    await expect(service.generateText("Consulta")).rejects.toThrow(
      /Solicitud inválida a la API de Gemini \(400\)/i,
    );
  });

  it("9. Permite reconfigurar dinámicamente el modelo y la clave mediante configure() e init()", () => {
    const service = new GeminiAiService();
    expect(service.isConfigured()).toBe(false);
    expect(service.getModelName()).toBe("gemini-1.5-flash-latest");

    service.configure({ apiKey: "new-key-123", modelName: "gemini-1.5-pro" });
    expect(service.isConfigured()).toBe(true);
    expect(service.getEffectiveApiKey()).toBe("new-key-123");
    expect(service.getModelName()).toBe("gemini-1.5-pro");
  });

  it("10. La instancia singleton exportada geminiAiService existe y está disponible", () => {
    expect(geminiAiService).toBeInstanceOf(GeminiAiService);
    expect(geminiAiService.getModelName()).toBe("gemini-1.5-flash-latest");
  });

  it("11. Reintenta defensivamente ante error 503 (alta demanda / saturación) y retorna exitoso en el segundo intento", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSy503TestKey" });

    // Intento 1: Error 503 transitorio
    mockGenerateContent.mockRejectedValueOnce(
      new Error(
        "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent: [503] This model is currently experiencing high demand.",
      ),
    );
    // Intento 2 (Reintento): Respuesta exitosa
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Respuesta recuperada exitosamente tras reintento defensivo",
      },
    });

    const result = await service.generateText("Consulta tras 503", {
      retryDelayMs: 10,
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result).toBe("Respuesta recuperada exitosamente tras reintento defensivo");
  });

  it("12. Reintenta defensivamente ante error 429 (Resource exhausted) y retorna exitoso en el segundo intento", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSy429TestKey" });

    mockGenerateContent.mockRejectedValueOnce(
      new Error(
        "[GoogleGenerativeAI Error]: [429 Too Many Requests] Resource has been exhausted",
      ),
    );
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Respuesta recuperada exitosamente tras 429",
      },
    });

    const result = await service.generateText("Consulta tras 429", {
      retryDelayMs: 10,
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result).toBe("Respuesta recuperada exitosamente tras 429");
  });

  it("13. Falla con error descriptivo (503) cuando el error persiste tras agotar los reintentos y toda la cascada de modelos", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyPersistent503Key" });

    mockGenerateContent.mockRejectedValue(
      new Error(
        "[GoogleGenerativeAI Error]: [503] This model is currently experiencing high demand.",
      ),
    );

    await expect(
      service.generateText("Consulta persistente", { retryDelayMs: 10 }),
    ).rejects.toThrow(/Servicio de Gemini saturado o no disponible \(503\)/i);

    // Cascada: cada modelo × 2 intentos (1 + 1 reintento)
    expect(mockGenerateContent).toHaveBeenCalledTimes(CANDIDATE_MODELS.length * 2);
  });

  it("14. No realiza reintento ni cascada ante errores no transitorios como 400 Bad Request", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyNonTransientKey" });

    mockGenerateContent.mockRejectedValue(
      new Error("[GoogleGenerativeAI Error]: [400 Bad Request] Invalid argument"),
    );

    await expect(
      service.generateText("Consulta inválida", { retryDelayMs: 10 }),
    ).rejects.toThrow(/Solicitud inválida a la API de Gemini \(400\)/i);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("15. CANDIDATE_MODELS contiene los identificadores compatibles con v1beta en orden de prioridad", () => {
    expect(CANDIDATE_MODELS).toEqual([
      "gemini-1.5-flash-latest",
      "gemini-flash-latest",
      "gemini-pro",
    ]);
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-1.5-flash-latest");
  });

  it("16. Cascada de modelos: resuelve con segundo candidato tras 404 en el primero", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyCascadeTest" });

    // El primer modelo falla con 404
    mockGenerateContent.mockRejectedValueOnce(
      new Error(
        "[404] models/gemini-1.5-flash-latest is not found for API version v1beta, or is not supported for generateContent.",
      ),
    );
    // El segundo modelo resuelve exitosamente
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Respuesta exitosa desde modelo alternativo de la cascada",
      },
    });

    const result = await service.generateText("Consulta con cascada", {
      retryDelayMs: 10,
    });

    expect(result).toBe("Respuesta exitosa desde modelo alternativo de la cascada");
    // Se crearon 2 modelos generativos: uno por cada candidato intentado
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2);
    // El servicio actualiza internamente al modelo que funcionó
    expect(service.getModelName()).toBe(CANDIDATE_MODELS[1]);
  });

  it("17. Cascada de modelos: resuelve con tercer candidato tras 404 en el primero y 503 persistente en el segundo", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyCascadeTest3" });

    // Modelo 1: 404
    mockGenerateContent.mockRejectedValueOnce(
      new Error("[404] models/gemini-1.5-flash-latest is not found for API version v1beta."),
    );
    // Modelo 2: 503 intento 1
    mockGenerateContent.mockRejectedValueOnce(
      new Error("[503] This model is currently experiencing high demand."),
    );
    // Modelo 2: 503 intento 2 (reintento)
    mockGenerateContent.mockRejectedValueOnce(
      new Error("[503] This model is currently experiencing high demand."),
    );
    // Modelo 3: exitoso
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Respuesta desde tercer candidato (gemini-pro)",
      },
    });

    const result = await service.generateText("Consulta cascada completa", {
      retryDelayMs: 10,
    });

    expect(result).toBe("Respuesta desde tercer candidato (gemini-pro)");
    expect(service.getModelName()).toBe("gemini-pro");
  });

  it("18. Cascada de modelos: falla con error 404 descriptivo cuando ningún modelo está disponible", async () => {
    const service = new GeminiAiService({ apiKey: "AIzaSyAllFailKey" });

    mockGenerateContent.mockRejectedValue(
      new Error("[404] models/gemini is not found for API version v1beta."),
    );

    await expect(
      service.generateText("Consulta sin modelo", { retryDelayMs: 10 }),
    ).rejects.toThrow(/Ningún modelo de la cascada Gemini está disponible \(404\)/i);
  });
});
