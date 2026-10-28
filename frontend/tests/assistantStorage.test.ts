import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAssistantMessages,
  DEFAULT_WELCOME_MESSAGE,
  ECOPLAZA_ASSISTANT_MESSAGES_KEY,
  loadAssistantMessages,
  saveAssistantMessages,
  type AssistantMessage,
} from "../src/services/assistantStorage.ts";

describe("assistantStorage - Persistencia del historial del Asistente IA en sessionStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("1. Retorna el mensaje predeterminado cuando sessionStorage está vacío", () => {
    const result = loadAssistantMessages(DEFAULT_WELCOME_MESSAGE);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(DEFAULT_WELCOME_MESSAGE);
  });

  it("2. Retorna el mensaje predeterminado cuando sessionStorage contiene JSON corrupto o sintaxis inválida", () => {
    window.sessionStorage.setItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY, "{corrupt_json: true");
    const result = loadAssistantMessages(DEFAULT_WELCOME_MESSAGE);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(DEFAULT_WELCOME_MESSAGE);
  });

  it("3. Retorna el mensaje predeterminado cuando sessionStorage contiene array vacío o datos no válidos", () => {
    window.sessionStorage.setItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY, "[]");
    expect(loadAssistantMessages(DEFAULT_WELCOME_MESSAGE)).toEqual([DEFAULT_WELCOME_MESSAGE]);

    window.sessionStorage.setItem(
      ECOPLAZA_ASSISTANT_MESSAGES_KEY,
      JSON.stringify([{ invalid: true }]),
    );
    expect(loadAssistantMessages(DEFAULT_WELCOME_MESSAGE)).toEqual([DEFAULT_WELCOME_MESSAGE]);

    window.sessionStorage.setItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY, '"not an array"');
    expect(loadAssistantMessages(DEFAULT_WELCOME_MESSAGE)).toEqual([DEFAULT_WELCOME_MESSAGE]);
  });

  it("4. Guarda y recupera correctamente una lista de mensajes válidos", () => {
    const mockMessages: AssistantMessage[] = [
      DEFAULT_WELCOME_MESSAGE,
      {
        id: "2",
        role: "user",
        content: "¿Cuánto inventario reciclable tenemos disponible?",
      },
      {
        id: "3",
        role: "assistant",
        content: "Actualmente hay 450 kg de material reciclable valorizado en COP 1.200.000.",
        provider: "gemini",
      },
    ];

    saveAssistantMessages(mockMessages);

    const loaded = loadAssistantMessages(DEFAULT_WELCOME_MESSAGE);
    expect(loaded).toHaveLength(3);
    expect(loaded).toEqual(mockMessages);
  });

  it("5. Limpia el almacenamiento de mensajes en sessionStorage al invocar clearAssistantMessages()", () => {
    const mockMessages: AssistantMessage[] = [
      DEFAULT_WELCOME_MESSAGE,
      { id: "2", role: "user", content: "Hola" },
    ];

    saveAssistantMessages(mockMessages);
    expect(window.sessionStorage.getItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY)).not.toBeNull();

    clearAssistantMessages();
    expect(window.sessionStorage.getItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY)).toBeNull();

    const resultAfterClear = loadAssistantMessages(DEFAULT_WELCOME_MESSAGE);
    expect(resultAfterClear).toEqual([DEFAULT_WELCOME_MESSAGE]);
  });
});

