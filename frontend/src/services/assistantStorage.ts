export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  isIoT?: boolean;
  provider?: "gemini" | "local_fallback";
}

export type Message = AssistantMessage;

export const ECOPLAZA_ASSISTANT_MESSAGES_KEY = "ecoplaza_assistant_messages_v1";

export const DEFAULT_WELCOME_MESSAGE: AssistantMessage = {
  id: "1",
  role: "assistant",
  content:
    "¡Hola! Soy el asistente inteligente de EcoPlaza. ¿En qué puedo ayudarte hoy?",
  isIoT: false,
  provider: "local_fallback",
};

function getSessionStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage;
  }
  return null;
}

/**
 * Carga la lista de mensajes persistidos desde sessionStorage.
 * Si no hay mensajes, el JSON está corrupto o los datos son inválidos, retorna [defaultWelcomeMessage].
 */
export function loadAssistantMessages(
  defaultWelcomeMessage: AssistantMessage = DEFAULT_WELCOME_MESSAGE,
): AssistantMessage[] {
  const storage = getSessionStorage();
  if (!storage) {
    return [defaultWelcomeMessage];
  }

  try {
    const raw = storage.getItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY);
    if (!raw) {
      return [defaultWelcomeMessage];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [defaultWelcomeMessage];
    }

    const isValidMessage = (item: unknown): item is AssistantMessage => {
      if (typeof item !== "object" || item === null) return false;
      const candidate = item as Record<string, unknown>;
      const hasValidId =
        typeof candidate.id === "string" && candidate.id.trim() !== "";
      const hasValidRole =
        candidate.role === "assistant" || candidate.role === "user";
      const hasValidContent = typeof candidate.content === "string";
      return hasValidId && hasValidRole && hasValidContent;
    };

    const validMessages = parsed.filter(isValidMessage);
    if (validMessages.length === 0) {
      return [defaultWelcomeMessage];
    }

    return validMessages;
  } catch {
    return [defaultWelcomeMessage];
  }
}

/**
 * Guarda de forma segura la lista de mensajes en sessionStorage.
 */
export function saveAssistantMessages(messages: AssistantMessage[]): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      ECOPLAZA_ASSISTANT_MESSAGES_KEY,
      JSON.stringify(messages),
    );
  } catch {
    // Manejo defensivo ante cuotas de almacenamiento o restricciones del navegador
  }
}

/**
 * Elimina la clave de almacenamiento del historial del asistente en sessionStorage.
 */
export function clearAssistantMessages(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(ECOPLAZA_ASSISTANT_MESSAGES_KEY);
  } catch {
    // Manejo defensivo
  }
}

