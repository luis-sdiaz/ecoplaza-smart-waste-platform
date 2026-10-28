import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
        `Failed to fetch from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${secretKey}: Network connection failed`,
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
    expect(service.getModelName()).toBe("gemini-1.5-flash");

    service.configure({ apiKey: "new-key-123", modelName: "gemini-1.5-pro" });
    expect(service.isConfigured()).toBe(true);
    expect(service.getEffectiveApiKey()).toBe("new-key-123");
    expect(service.getModelName()).toBe("gemini-1.5-pro");
  });

  it("10. La instancia singleton exportada geminiAiService existe y está disponible", () => {
    expect(geminiAiService).toBeInstanceOf(GeminiAiService);
    expect(geminiAiService.getModelName()).toBe("gemini-1.5-flash");
  });
});

