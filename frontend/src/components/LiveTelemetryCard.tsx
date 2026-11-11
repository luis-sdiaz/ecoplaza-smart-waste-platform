import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Gauge, Radio, RefreshCw, Ruler } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  calculateFillStatus,
  fetchLatestTelemetryByContainer,
  isTelemetryFresh,
  type SensorTelemetry,
} from "../services/telemetryService";

export interface LiveTelemetryCardProps {
  containerId?: string;
  containerName?: string;
  refreshIntervalMs?: number;
  onTelemetryChange?: (telemetry: SensorTelemetry | null) => void;
}

function formatTelemetryTimestamp(
  isoDateStr: string | null | undefined,
  locale: string,
): string {
  if (!isoDateStr) return "—";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return "—";
  }
}

export default function LiveTelemetryCard({
  containerId = "CTR-BOG-001",
  containerName,
  refreshIntervalMs,
  onTelemetryChange,
}: LiveTelemetryCardProps) {
  const { t, i18n } = useTranslation();
  const revisionRef = useRef(0);
  const [telemetry, setTelemetry] = useState<SensorTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = useCallback(
    async (revision: number) => {
      try {
        const data = await fetchLatestTelemetryByContainer(containerId);
        if (revision !== revisionRef.current) return;
        setTelemetry(data);
        onTelemetryChange?.(
          data && isTelemetryFresh(data.recordedAt) ? data : null,
        );
        setError(null);
        setLoading(false);
      } catch (err: unknown) {
        if (revision !== revisionRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTelemetry(null);
        onTelemetryChange?.(null);
        setLoading(false);
      }
    },
    [containerId, onTelemetryChange],
  );

  const handleManualRefresh = useCallback(() => {
    const revision = ++revisionRef.current;
    setLoading(true);
    setError(null);
    void fetchTelemetry(revision);
  }, [fetchTelemetry]);

  useEffect(() => {
    const revision = ++revisionRef.current;
    void fetchTelemetry(revision);

    if (refreshIntervalMs && refreshIntervalMs > 0) {
      const timer = setInterval(() => {
        const periodicRevision = ++revisionRef.current;
        void fetchTelemetry(periodicRevision);
      }, refreshIntervalMs);
      return () => {
        clearInterval(timer);
      };
    }
  }, [fetchTelemetry, refreshIntervalMs]);

  const fillPercentage = telemetry ? telemetry.fillPercentage : 0;
  const status = calculateFillStatus(fillPercentage);
  const isCurrent = telemetry !== null && isTelemetryFresh(telemetry.recordedAt);

  const progressColorClass =
    status === "critical"
      ? "bg-red-600 dark:bg-red-500"
      : status === "warning"
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-emerald-700 dark:bg-emerald-600";

  const statusTextColorClass =
    status === "critical"
      ? "text-red-600 dark:text-red-400"
      : status === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-700 dark:text-emerald-400";

  const displayName = containerName || containerId;
  const locale = i18n.resolvedLanguage || "es";

  return (
    <div
      role="region"
      aria-label={`${t("sensors.liveTelemetryTitle")} - ${displayName}`}
      className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-md"
    >
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Radio size={22} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("sensors.liveTelemetryTitle")}
              </h3>
              <span className="rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {displayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("sensors.liveTelemetrySubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Badge de estado en línea / esperando */}
          {isCurrent ? (
            <span
              data-testid="live-telemetry-status-badge"
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("sensors.onlineStatus")}
            </span>
          ) : (
            <span
              data-testid="live-telemetry-status-badge"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              {telemetry
                ? t("sensors.historicalStatus")
                : t("sensors.waitingForSensor")}
            </span>
          )}

          {/* Botón de actualización manual */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            aria-label={`${t("sensors.refreshTelemetry")} (${displayName})`}
            title={t("sensors.refreshTelemetry")}
            className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/5 p-2 text-slate-600 dark:text-slate-300 transition-all hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              strokeWidth={2}
              className={loading ? "animate-spin text-emerald-600" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Contenido / Métricas en vivo */}
      {loading && !telemetry ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex min-h-36 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400"
        >
          <RefreshCw
            size={18}
            className="animate-spin text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>{t("sensors.loadingTelemetry")}</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 flex flex-col items-center justify-center rounded-xl border border-red-200/80 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-5 text-center text-xs text-red-600 dark:text-red-400"
        >
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-2 text-xs font-bold underline hover:opacity-80"
          >
            {t("containers.retry")}
          </button>
        </div>
      ) : !telemetry ? (
        <div className="mt-6 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 p-6 text-center">
          <Activity size={24} className="text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("sensors.noTelemetryYet")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t("sensors.waitingForSensor")} ({displayName})
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Nivel de llenado y barra de progreso */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("sensors.fillLevel")}
              </span>
              <Gauge size={16} className={statusTextColorClass} aria-hidden="true" />
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${statusTextColorClass}`}>
                {fillPercentage}%
              </span>
              <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">
                {status}
              </span>
            </div>

            <div className="mt-3">
              <div
                role="progressbar"
                aria-valuenow={fillPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("sensors.fillLevel")}
                className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700/60"
              >
                <div
                  className={`h-full transition-all duration-500 ${progressColorClass}`}
                  style={{ width: `${Math.min(Math.max(fillPercentage, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Distancia ultrasónica */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("sensors.ultrasonicDistance")}
              </span>
              <Ruler size={16} className="text-slate-400" aria-hidden="true" />
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {telemetry.distanceCm}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                cm
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Sensor HC-SR04
            </p>
          </div>

          {/* Card 3: Última lectura */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("sensors.lastReading")}
              </span>
              <Activity size={16} className="text-slate-400" aria-hidden="true" />
            </div>

            <div className="mt-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatTelemetryTimestamp(telemetry.recordedAt, locale)}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              ID: {telemetry.containerId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
