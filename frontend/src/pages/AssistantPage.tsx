import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Paperclip, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import { generateAssistantResponse } from "../services/assistantService";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const QUICK_PROMPTS = [
  "📊 Analizar tendencias de ventas de este mes",
  "♻️ Identificar residuos estancados en inventario",
  "📈 Proyectar ingresos basados en stock actual",
];

function AssistantPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "¡Hola! Soy el asistente inteligente de EcoPlaza. ¿En qué puedo ayudarte a analizar hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const triggerAssistantResponse = async (promptText: string) => {
    setIsTyping(true);
    try {
      const response = await generateAssistantResponse(promptText);
      if (!isMountedRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          role: "assistant",
          content: response,
        },
      ]);
    } catch {
      if (!isMountedRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          role: "assistant",
          content:
            "Lo sentimos, ocurrió un error al consultar las métricas de la plataforma. Por favor, verifica tu conexión e inténtalo de nuevo.",
        },
      ]);
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false);
      }
    }
  };

  const handleSendMessage = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmed = input.trim();
    if (!trimmed || isTyping) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        role: "user",
        content: trimmed,
      },
    ]);
    setInput("");
    void triggerAssistantResponse(trimmed);
  };

  const handleSelectPrompt = (promptText: string) => {
    if (isTyping) {
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        role: "user",
        content: promptText,
      },
    ]);
    void triggerAssistantResponse(promptText);
  };

  return (
    <section className="flex h-full flex-col p-6 lg:p-8">
      <div className="shrink-0">
        <PageHeader
          eyebrow={t("assistant.eyebrow")}
          title={t("assistant.title")}
          description={t("assistant.description")}
        />
      </div>

      <div className="mt-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-xs">
        {/* Encabezado del asistente */}
        <div className="flex shrink-0 items-center border-b border-ecoplaza-border bg-ecoplaza-surface p-4 sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
              <Bot size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ecoplaza-text">
                EcoPlaza IA
              </h2>
              <p className="text-sm text-ecoplaza-text-muted">
                Asistente inteligente para análisis y optimización de residuos
              </p>
            </div>
          </div>
        </div>

        {/* Área de mensajes (scrollable) */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          {messages.map((message) =>
            message.role === "assistant" ? (
              <div key={message.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-ecoplaza-border bg-ecoplaza-background text-ecoplaza-primary">
                  <Bot size={18} aria-hidden="true" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text shadow-xs sm:max-w-[75%]">
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-ecoplaza-primary px-4 py-3 text-sm text-white shadow-xs sm:max-w-[75%]">
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ),
          )}
          {messages.length === 1 && (
            <div className="mt-2 sm:pl-11">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSelectPrompt(prompt)}
                    className="cursor-pointer rounded-xl border border-ecoplaza-border bg-ecoplaza-surface p-3.5 sm:p-4 text-left text-xs sm:text-sm font-medium text-ecoplaza-text-muted shadow-2xs transition-colors hover:border-ecoplaza-primary/50 hover:bg-ecoplaza-background hover:text-ecoplaza-text"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-ecoplaza-border bg-ecoplaza-background text-ecoplaza-primary">
                <Bot size={18} aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text shadow-xs">
                <Loader2
                  size={16}
                  className="animate-spin text-ecoplaza-primary"
                  aria-hidden="true"
                />
                <span className="text-sm text-ecoplaza-text-muted">
                  EcoPlaza IA está escribiendo...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Zona de entrada de texto fija al fondo */}
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 border-t border-ecoplaza-border bg-ecoplaza-surface p-4 pb-6 sm:px-6 sm:pb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 transition-all focus-within:border-ecoplaza-primary focus-within:ring-2 focus-within:ring-ecoplaza-primary/20">
              <button
                type="button"
                aria-label="Adjuntar documento"
                title="Adjuntar documento"
                className="cursor-pointer text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-primary"
              >
                <Paperclip size={18} aria-hidden="true" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe una consulta sobre residuos, ventas o inventario..."
                className="h-full flex-1 bg-transparent text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              aria-label="Enviar mensaje"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default AssistantPage;
