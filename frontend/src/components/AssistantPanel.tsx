import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowRight, Bot, Loader2, Send } from "lucide-react";
import { listContainers } from "../services/containerService";
import { getLatestTelemetry } from "../services/sensorService";
import {
  generateAssistantResponse,
  isIoTFleetResponse,
  type ContainerTelemetrySnapshot,
} from "../services/assistantService";

export interface AssistantPanelProps {
  onNavigateToSensors?: () => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  isIoT?: boolean;
}

const QUICK_PROMPTS = [
  "📊 Analizar tendencias de ventas de este mes",
  "♻️ Identificar residuos estancados en inventario",
  "📈 Proyectar ingresos basados en stock actual",
  "📡 Consultar estado de sensores IoT",
];

async function fetchLiveTelemetrySnapshots(): Promise<ContainerTelemetrySnapshot[]> {
  try {
    const containersResult = await listContainers();
    if (!containersResult.ok || !Array.isArray(containersResult.data)) {
      return [];
    }

    const telemetryPromises = containersResult.data.map(async (c) => {
      try {
        const tel = await getLatestTelemetry(c.id);
        if (!tel) return null;
        const snapshot: ContainerTelemetrySnapshot = {
          containerId: c.id,
          containerName: c.code,
          fillLevel: tel.fillLevelPercent,
          batteryLevel: tel.batteryLevelPercent,
          temperature: tel.temperatureCelsius,
          updatedAt: tel.recordedAt,
        };
        return snapshot;
      } catch {
        return null;
      }
    });

    const resolved = await Promise.all(telemetryPromises);
    return resolved.filter(
      (item): item is ContainerTelemetrySnapshot => item !== null,
    );
  } catch {
    return [];
  }
}

function AssistantPanel({ onNavigateToSensors, className = "" }: AssistantPanelProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        t("assistant.greeting") ||
        "¡Hola! Soy el asistente inteligente de EcoPlaza. ¿En qué puedo ayudarte hoy?",
      isIoT: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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
      const snapshots = await fetchLiveTelemetrySnapshots();
      const lang = (i18n.resolvedLanguage === "en" ? "en" : "es") as "es" | "en";
      const response = await generateAssistantResponse(promptText, lang, snapshots);

      if (!isMountedRef.current) return;

      const isIoT = isIoTFleetResponse(response);
      setMessages((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          role: "assistant",
          content: response,
          isIoT,
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
            t("assistant.errorResponse") ||
            "Lo sentimos, ocurrió un error al consultar las métricas de la plataforma. Por favor, verifica tu conexión e inténtalo de nuevo.",
          isIoT: false,
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

  const handleGoToSensors = (e: React.MouseEvent) => {
    if (onNavigateToSensors) {
      e.preventDefault();
      onNavigateToSensors();
    }
  };

  return (
    <article
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-xs ${className}`}
    >
      {/* Encabezado del asistente */}
      <div className="flex shrink-0 items-center justify-between border-b border-ecoplaza-border bg-ecoplaza-surface p-4 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
            <Bot size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ecoplaza-text">
              {t("assistant.panelTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-ecoplaza-text-muted">
              {t("assistant.panelDescription")}
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span
            className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden="true"
          />
          {t("assistant.onlineLabel")}
        </span>
      </div>

      {/* Área de mensajes con scroll */}
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

                {message.isIoT && (
                  <div className="mt-3.5 border-t border-ecoplaza-border pt-3">
                    <Link
                      to="/sensors"
                      onClick={handleGoToSensors}
                      aria-label={t("assistant.goToSensorsAction")}
                      className="inline-flex items-center gap-2 rounded-xl bg-ecoplaza-primary/10 px-3.5 py-2 text-xs font-semibold text-ecoplaza-primary transition-colors hover:bg-ecoplaza-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-ecoplaza-primary/30"
                    >
                      <Activity size={15} aria-hidden="true" />
                      <span>{t("assistant.goToSensorsAction")}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                )}
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
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
                {t("assistant.typingIndicator")}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de entrada */}
      <form
        onSubmit={handleSendMessage}
        className="shrink-0 border-t border-ecoplaza-border bg-ecoplaza-surface p-4 pb-6 sm:px-6 sm:pb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 transition-all focus-within:border-ecoplaza-primary focus-within:ring-2 focus-within:ring-ecoplaza-primary/20">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.inputPlaceholder")}
              aria-label={t("assistant.inputPlaceholder")}
              className="h-full flex-1 bg-transparent text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            aria-label={t("assistant.sendButtonLabel")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </article>
  );
}

export default AssistantPanel;
