import { useCallback, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BatteryWarning,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  calculateFleetHealth,
  generateIoTExecutiveSummary,
  type ContainerTelemetrySnapshot,
  type IoTFleetHealthSummary,
} from "../services/iotAnalyticsService";
import { listContainers } from "../services/containerService";
import { getLatestTelemetry } from "../services/sensorService";

export interface IoTFleetDiagnosticCardProps {
  initialSnapshots?: ContainerTelemetrySnapshot[];
  initialSummary?: IoTFleetHealthSummary | null;
  onAudit?: () => Promise<ContainerTelemetrySnapshot[]>;
  className?: string;
}

export default function IoTFleetDiagnosticCard({
  initialSnapshots,
  initialSummary = null,
  onAudit,
  className = "",
}: IoTFleetDiagnosticCardProps) {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<IoTFleetHealthSummary | null>(() => {
    if (initialSummary) return initialSummary;
    if (initialSnapshots && initialSnapshots.length > 0) {
      return calculateFleetHealth(initialSnapshots);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lang = (i18n.resolvedLanguage === "en" ? "en" : "es") as "es" | "en";

  const runDiagnostic = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let snapshots: ContainerTelemetrySnapshot[] = [];

      if (onAudit) {
        snapshots = await onAudit();
      } else if (initialSnapshots !== undefined) {
        snapshots = initialSnapshots;
      } else {
        const containersResult = await listContainers();
        if (containersResult.ok && Array.isArray(containersResult.data)) {
          const telemetryPromises: Promise<ContainerTelemetrySnapshot | null>[] =
            containersResult.data.map(async (container) => {
              try {
                const telemetry = await getLatestTelemetry(container.id);
                if (!telemetry) return null;
                const snapshot: ContainerTelemetrySnapshot = {
                  containerId: container.id,
                  containerName: container.code,
                  fillLevel: telemetry.fillLevelPercent,
                  batteryLevel: telemetry.batteryLevelPercent,
                  temperature: telemetry.temperatureCelsius,
                  updatedAt: telemetry.recordedAt,
                };
                return snapshot;
              } catch {
                return null;
              }
            });

          const resolved = await Promise.all(telemetryPromises);
          snapshots = resolved.filter(
            (item): item is ContainerTelemetrySnapshot => item !== null,
          );
        }
      }

      const calculated = calculateFleetHealth(snapshots);
      setSummary(calculated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al auditar la flota IoT",
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialSnapshots, onAudit]);

  const renderSeverityBadge = (statusKey: string) => {
    switch (statusKey) {
      case "critical":
        return (
          <span
            data-testid="diagnostic-severity-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-500"
          >
            <AlertTriangle size={14} aria-hidden="true" />
            {t("iotDiagnostic.severityCritical")}
          </span>
        );
      case "warning":
        return (
          <span
            data-testid="diagnostic-severity-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {t("iotDiagnostic.severityWarning")}
          </span>
        );
      case "optimal":
        return (
          <span
            data-testid="diagnostic-severity-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500"
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            {t("iotDiagnostic.severityOptimal")}
          </span>
        );
      default:
        return (
          <span
            data-testid="diagnostic-severity-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-ecoplaza-border bg-ecoplaza-background px-2.5 py-1 text-xs font-medium text-ecoplaza-text-muted"
          >
            <Inbox size={14} aria-hidden="true" />
            {t("iotDiagnostic.severityEmpty")}
          </span>
        );
    }
  };

  return (
    <article
      role="region"
      aria-label={t("iotDiagnostic.cardTitle")}
      className={`rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 shadow-xs transition-all ${className}`}
    >
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ecoplaza-border pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ecoplaza-text">
                {t("iotDiagnostic.cardTitle")}
              </h2>
              {summary && renderSeverityBadge(summary.operationalStatusKey)}
            </div>
            <p className="mt-0.5 text-xs text-ecoplaza-text-muted">
              {t("iotDiagnostic.cardSubtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runDiagnostic()}
          disabled={isLoading}
          aria-label={
            summary
              ? t("iotDiagnostic.refreshButton")
              : t("iotDiagnostic.auditButton")
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ecoplaza-primary px-3.5 py-2 text-xs font-medium text-white shadow-2xs transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              <span>{t("iotDiagnostic.auditingButton")}</span>
            </>
          ) : summary ? (
            <>
              <RefreshCw size={15} aria-hidden="true" />
              <span>{t("iotDiagnostic.refreshButton")}</span>
            </>
          ) : (
            <>
              <Sparkles size={15} aria-hidden="true" />
              <span>{t("iotDiagnostic.auditButton")}</span>
            </>
          )}
        </button>
      </div>

      {/* Error de consulta si existe */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500"
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Estado previo a auditoría */}
      {summary === null && !isLoading && !errorMessage && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-ecoplaza-border bg-ecoplaza-background/40 py-8 px-4 text-center">
          <Sparkles className="mb-2 text-ecoplaza-primary" size={24} aria-hidden="true" />
          <p className="text-xs text-ecoplaza-text-muted max-w-sm">
            {t("iotDiagnostic.emptyFleetDescription")}
          </p>
        </div>
      )}

      {/* Resultados de la auditoría */}
      {summary !== null && (
        <div className="mt-4 space-y-4">
          {/* Métricas clave */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <span className="text-xs font-medium text-ecoplaza-text-muted">
                {t("iotDiagnostic.totalMonitored")}
              </span>
              <p
                data-testid="diagnostic-total-monitored"
                className="mt-1 text-xl font-bold text-ecoplaza-text"
              >
                {summary.totalMonitored}
              </p>
            </div>

            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("iotDiagnostic.averageFill")}
                </span>
                <TrendingUp size={14} className="text-ecoplaza-text-muted" aria-hidden="true" />
              </div>
              <p
                data-testid="diagnostic-average-fill"
                className="mt-1 text-xl font-bold text-ecoplaza-text"
              >
                {summary.averageFillLevel}%
              </p>
            </div>

            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("iotDiagnostic.lowBattery")}
                </span>
                <BatteryWarning
                  size={14}
                  className={
                    summary.lowBatteryCount > 0
                      ? "text-rose-500"
                      : "text-ecoplaza-text-muted"
                  }
                  aria-hidden="true"
                />
              </div>
              <p
                data-testid="diagnostic-low-battery"
                className={`mt-1 text-xl font-bold ${
                  summary.lowBatteryCount > 0
                    ? "text-rose-500"
                    : "text-ecoplaza-text"
                }`}
              >
                {summary.lowBatteryCount}
              </p>
            </div>
          </div>

          {/* Resumen ejecutivo en lenguaje natural */}
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3.5 text-xs sm:text-sm text-ecoplaza-text leading-relaxed"
          >
            <p data-testid="diagnostic-executive-summary">
              {generateIoTExecutiveSummary(summary, lang)}
            </p>
          </div>

          {/* Cola de despacho urgente */}
          {summary.urgentDispatchList.length > 0 ? (
            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/30 p-3">
              <h3 className="mb-2 text-xs font-semibold text-ecoplaza-text">
                {t("iotDiagnostic.urgentDispatchTitle")} ({summary.urgentDispatchList.length})
              </h3>
              <ul
                data-testid="diagnostic-dispatch-list"
                className="divide-y divide-ecoplaza-border/60"
              >
                {summary.urgentDispatchList.map((item) => (
                  <li
                    key={item.containerId}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.priority === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}
                      >
                        {item.priority === "CRITICAL"
                          ? t("iotDiagnostic.immediateDispatch")
                          : t("iotDiagnostic.scheduledCollection")}
                      </span>
                      <span className="font-medium text-ecoplaza-text">
                        {item.containerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-ecoplaza-text-muted">
                        {t("iotDiagnostic.fillLevelLabel")}:
                      </span>
                      <span className="font-bold text-ecoplaza-text">
                        {item.fillLevel}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : summary.totalMonitored > 0 ? (
            <div className="rounded-xl border border-ecoplaza-border bg-emerald-500/5 p-3 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {t("iotDiagnostic.noUrgentDispatch")}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

