import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Coins,
  Loader2,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { listContainers } from "../services/containerService";
import { getLatestTelemetry } from "../services/sensorService";
import {
  formatCurrencyCop,
  formatWeightKg,
  generateAssistantResponse,
  isIoTFleetResponse,
  type ContainerTelemetrySnapshot,
} from "../services/assistantService";
import {
  calculateStockValuation,
  detectStorageRisks,
  matchBuyersForAvailableStock,
  fetchOperationalInsightsData,
} from "../services/assistantInsightsService";
import type { RemoteWasteRecord } from "../services/wasteService";
import type { SaleHistoryItem } from "../services/salesService";
import type { Buyer } from "../services/buyerService";

export interface AssistantPanelProps {
  onNavigateToSensors?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToBuyers?: () => void;
  className?: string;
  initialInsightsData?: {
    inventory: RemoteWasteRecord[];
    sales: SaleHistoryItem[];
    buyers: Buyer[];
  };
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  isIoT?: boolean;
}

export type ActiveInsightType = "valuation" | "risks" | "buyers" | null;

const QUICK_PROMPTS = [
  "📊 Analizar tendencias de ventas de este mes",
  "♻️ Identificar residuos estancados en inventario",
  "📈 Proyectar ingresos basados en stock actual",
  "📡 Consultar estado de sensores IoT",
];

async function fetchLiveTelemetrySnapshots(): Promise<
  ContainerTelemetrySnapshot[]
> {
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

function AssistantPanel({
  onNavigateToSensors,
  onNavigateToInventory,
  onNavigateToBuyers,
  className = "",
  initialInsightsData,
}: AssistantPanelProps) {
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

  // Estado del motor de análisis predictivo
  const [activeInsight, setActiveInsight] = useState<ActiveInsightType>(null);
  const [fetchedInsightsData, setFetchedInsightsData] = useState<{
    inventory: RemoteWasteRecord[];
    sales: SaleHistoryItem[];
    buyers: Buyer[];
  } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const insightsData = initialInsightsData ?? fetchedInsightsData;

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

  const loadInsightsDataIfNeeded = async () => {
    if (insightsData !== null) return insightsData;
    setIsLoadingInsights(true);
    try {
      const data = await fetchOperationalInsightsData();
      if (isMountedRef.current) {
        setFetchedInsightsData(data);
      }
      return data;
    } finally {
      if (isMountedRef.current) {
        setIsLoadingInsights(false);
      }
    }
  };

  const handleToggleInsight = async (
    type: "valuation" | "risks" | "buyers",
  ) => {
    if (activeInsight === type) {
      setActiveInsight(null);
      return;
    }
    setActiveInsight(type);
    await loadInsightsDataIfNeeded();
  };

  const triggerAssistantResponse = async (promptText: string) => {
    setIsTyping(true);
    try {
      const snapshots = await fetchLiveTelemetrySnapshots();
      const lang = (i18n.resolvedLanguage === "en" ? "en" : "es") as
        "es" | "en";
      const response = await generateAssistantResponse(
        promptText,
        lang,
        snapshots,
      );

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

  const handleGoToInventory = (e: React.MouseEvent) => {
    if (onNavigateToInventory) {
      e.preventDefault();
      onNavigateToInventory();
    }
  };

  const handleGoToBuyers = (e: React.MouseEvent) => {
    if (onNavigateToBuyers) {
      e.preventDefault();
      onNavigateToBuyers();
    }
  };

  // Cálculos reactivos según el insight seleccionado
  const inventory = insightsData?.inventory ?? [];
  const sales = insightsData?.sales ?? [];
  const buyers = insightsData?.buyers ?? [];

  const stockValuation =
    activeInsight === "valuation"
      ? calculateStockValuation(inventory, sales)
      : null;

  const storageRisks =
    activeInsight === "risks" ? detectStorageRisks(inventory) : null;

  const buyerMatch =
    activeInsight === "buyers"
      ? matchBuyersForAvailableStock(inventory, buyers, sales)
      : null;

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

      {/* Barra de Chips de Análisis Estratégico */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ecoplaza-border bg-ecoplaza-background/50 px-4 py-2.5 sm:px-6">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ecoplaza-text-muted">
          <Sparkles
            size={14}
            className="text-ecoplaza-primary"
            aria-hidden="true"
          />
          <span>{t("assistant.insights.title")}:</span>
        </span>

        <button
          type="button"
          onClick={() => void handleToggleInsight("valuation")}
          aria-pressed={activeInsight === "valuation"}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeInsight === "valuation"
              ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
              : "border-ecoplaza-border bg-ecoplaza-surface text-ecoplaza-text hover:border-emerald-500/50 hover:bg-emerald-500/5"
          }`}
        >
          <Coins size={13} aria-hidden="true" />
          <span>{t("assistant.insights.valuationChip")}</span>
        </button>

        <button
          type="button"
          onClick={() => void handleToggleInsight("risks")}
          aria-pressed={activeInsight === "risks"}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeInsight === "risks"
              ? "border-amber-500 bg-amber-500 text-white shadow-xs"
              : "border-ecoplaza-border bg-ecoplaza-surface text-ecoplaza-text hover:border-amber-500/50 hover:bg-amber-500/5"
          }`}
        >
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{t("assistant.insights.agingChip")}</span>
        </button>

        <button
          type="button"
          onClick={() => void handleToggleInsight("buyers")}
          aria-pressed={activeInsight === "buyers"}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeInsight === "buyers"
              ? "border-sky-500 bg-sky-500 text-white shadow-xs"
              : "border-ecoplaza-border bg-ecoplaza-surface text-ecoplaza-text hover:border-sky-500/50 hover:bg-sky-500/5"
          }`}
        >
          <Users size={13} aria-hidden="true" />
          <span>{t("assistant.insights.buyersChip")}</span>
        </button>
      </div>

      {/* Tarjeta de Diagnóstico Activo */}
      {activeInsight && (
        <section
          role="region"
          aria-label={
            activeInsight === "valuation"
              ? t("assistant.insights.valuationTitle")
              : activeInsight === "risks"
                ? t("assistant.insights.risksTitle")
                : t("assistant.insights.buyersTitle")
          }
          className="relative shrink-0 border-b border-ecoplaza-border bg-ecoplaza-surface/90 p-4 transition-all sm:p-5"
        >
          <button
            type="button"
            onClick={() => setActiveInsight(null)}
            className="absolute top-4 right-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted hover:bg-ecoplaza-border/30 hover:text-ecoplaza-text"
            aria-label={t("assistant.insights.close")}
          >
            <X size={15} aria-hidden="true" />
          </button>

          {isLoadingInsights ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ecoplaza-text-muted">
              <Loader2
                size={18}
                className="animate-spin text-ecoplaza-primary"
              />
              <span>{t("assistant.typingIndicator")}</span>
            </div>
          ) : (
            <>
              {/* Diagnóstico 1: Valorización de Stock */}
              {activeInsight === "valuation" && stockValuation && (
                <div className="flex flex-col gap-3">
                  <div className="pr-8">
                    <h3 className="text-sm font-bold text-ecoplaza-text">
                      {t("assistant.insights.valuationTitle")}
                    </h3>
                    <p className="text-xs text-ecoplaza-text-muted">
                      {t("assistant.insights.valuationSubtitle")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
                      <span className="text-xs font-medium text-ecoplaza-text-muted">
                        {t("assistant.insights.totalEstimatedValue")}
                      </span>
                      <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyCop(
                          stockValuation.totalEstimatedValueCop,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
                      <span className="text-xs font-medium text-ecoplaza-text-muted">
                        {t("assistant.insights.totalAvailableStock")}
                      </span>
                      <p className="mt-1 text-lg font-bold text-ecoplaza-text">
                        {formatWeightKg(stockValuation.totalWeightKg)}
                      </p>
                    </div>
                  </div>

                  {/* Desglose por categoría */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {stockValuation.breakdown.map((item) => (
                      <div
                        key={item.category}
                        className="flex flex-col rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ecoplaza-text">
                            {t(item.categoryLabelKey)}
                          </span>
                          <span className="text-ecoplaza-text-muted">
                            {item.percentageOfTotalValue}%
                          </span>
                        </div>
                        <span className="mt-0.5 text-ecoplaza-text-muted">
                          {formatWeightKg(item.weightKg)} ·{" "}
                          {formatCurrencyCop(item.averagePricePerKgCop)}/kg
                        </span>
                        <span className="mt-1 font-bold text-ecoplaza-text">
                          {formatCurrencyCop(item.subtotalCop)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/inventory"
                      onClick={handleGoToInventory}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ecoplaza-primary hover:underline"
                    >
                      <span>{t("assistant.insights.goToInventoryAction")}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Diagnóstico 2: Riesgo de Merma y Antigüedad */}
              {activeInsight === "risks" && storageRisks && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2 pr-8">
                    <div>
                      <h3 className="text-sm font-bold text-ecoplaza-text">
                        {t("assistant.insights.risksTitle")}
                      </h3>
                      <p className="text-xs text-ecoplaza-text-muted">
                        {t("assistant.insights.risksSubtitle")}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        storageRisks.severity === "critical"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : storageRisks.severity === "warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {storageRisks.severity === "critical"
                        ? t("assistant.insights.criticalRisk")
                        : storageRisks.severity === "warning"
                          ? t("assistant.insights.moderateRisk")
                          : t("assistant.insights.optimalRisk")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
                      <span className="text-xs font-medium text-ecoplaza-text-muted">
                        {t("assistant.insights.atRiskLots")}
                      </span>
                      <p className="mt-1 text-lg font-extrabold text-ecoplaza-text">
                        {storageRisks.totalAtRiskLots}{" "}
                        <span className="text-xs font-normal text-ecoplaza-text-muted">
                          / {storageRisks.totalLots}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
                      <span className="text-xs font-medium text-ecoplaza-text-muted">
                        {t("assistant.insights.atRiskWeight")}
                      </span>
                      <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                        {formatWeightKg(storageRisks.totalAtRiskWeightKg)}
                      </p>
                    </div>
                  </div>

                  {storageRisks.compromisedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {storageRisks.compromisedCategories.map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center gap-2 rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-1.5 text-xs text-ecoplaza-text"
                        >
                          <span className="font-semibold">
                            {t(item.categoryLabelKey)}:
                          </span>
                          <span>
                            {item.atRiskLots} lotes ·{" "}
                            {formatWeightKg(item.atRiskWeightKg)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      to="/inventory"
                      onClick={handleGoToInventory}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ecoplaza-primary hover:underline"
                    >
                      <span>{t("assistant.insights.goToInventoryAction")}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Diagnóstico 3: Compradores Sugeridos por Afinidad */}
              {activeInsight === "buyers" && buyerMatch && (
                <div className="flex flex-col gap-3">
                  <div className="pr-8">
                    <h3 className="text-sm font-bold text-ecoplaza-text">
                      {t("assistant.insights.buyersTitle")}
                    </h3>
                    <p className="text-xs text-ecoplaza-text-muted">
                      {t("assistant.insights.buyersSubtitle")}
                    </p>
                  </div>

                  {buyerMatch.recommendedBuyers.length === 0 ? (
                    <p className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3 text-xs text-ecoplaza-text-muted">
                      {t("assistant.insights.noBuyersMatched")}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {buyerMatch.recommendedBuyers.map((buyer) => (
                        <div
                          key={buyer.buyerId}
                          className="flex flex-col justify-between gap-1 rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3 text-xs sm:flex-row sm:items-center"
                        >
                          <div>
                            <span className="font-bold text-ecoplaza-text">
                              {buyer.buyerName}
                            </span>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-ecoplaza-text-muted">
                              {buyer.phone && <span>Tel: {buyer.phone}</span>}
                              {buyer.email && <span>{buyer.email}</span>}
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="font-semibold text-ecoplaza-primary">
                              {formatWeightKg(buyer.totalHistoricalWeightKg)}
                            </span>
                            <p className="text-[11px] text-ecoplaza-text-muted">
                              {t("assistant.insights.historicalVolume")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      to="/buyers"
                      onClick={handleGoToBuyers}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ecoplaza-primary hover:underline"
                    >
                      <span>{t("assistant.insights.goToBuyersAction")}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Área de mensajes con scroll */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        {messages.map((message) =>
          message.role === "assistant" ? (
            <div key={message.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-ecoplaza-border bg-ecoplaza-background text-ecoplaza-primary">
                <Bot size={18} aria-hidden="true" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text shadow-xs sm:max-w-[75%]">
                <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
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
                <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
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
