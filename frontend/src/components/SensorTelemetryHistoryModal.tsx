import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Battery,
  BatteryMedium,
  BatteryWarning,
  History,
  LoaderCircle,
  Radio,
  RefreshCw,
  Thermometer,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDialogFocus } from "../hooks/useDialogFocus";
import {
  getTelemetryHistory,
  type TelemetryRecord,
} from "../services/sensorService";

export interface SensorTelemetryHistoryModalProps {
  containerId: string;
  containerName: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatHistoryDate(isoDateStr: string, locale: string): string {
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "—";
  }
}

function SensorTelemetryHistoryModal({
  containerId,
  containerName,
  isOpen,
  onClose,
}: SensorTelemetryHistoryModalProps) {
  const { t, i18n } = useTranslation();
  const dialogRef = useDialogFocus(onClose, isOpen);

  const [history, setHistory] = useState<TelemetryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await getTelemetryHistory(containerId, 50);
        setHistory(data);
        setError(null);
        setIsLoading(false);
      } catch {
        setHistory([]);
        setError("sensors.historyError");
        setIsLoading(false);
      }
    },
    [containerId],
  );

  useEffect(() => {
    if (!isOpen || !containerId) return;

    let isSubscribed = true;
    const executeFetch = async () => {
      try {
        const data = await getTelemetryHistory(containerId, 50);
        if (!isSubscribed) return;
        setHistory(data);
        setError(null);
        setIsLoading(false);
      } catch {
        if (!isSubscribed) return;
        setHistory([]);
        setError("sensors.historyError");
        setIsLoading(false);
      }
    };

    void executeFetch();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, containerId]);

  if (!isOpen) return null;

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  const getBatteryIcon = (level: number) => {
    if (level <= 20) {
      return (
        <BatteryWarning
          className="shrink-0 text-ecoplaza-danger"
          size={16}
          aria-hidden="true"
        />
      );
    }
    if (level <= 50) {
      return (
        <BatteryMedium
          className="shrink-0 text-ecoplaza-warning"
          size={16}
          aria-hidden="true"
        />
      );
    }
    return (
      <Battery
        className="shrink-0 text-ecoplaza-primary"
        size={16}
        aria-hidden="true"
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="telemetry-history-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-2xl"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 border-b border-ecoplaza-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
                <History size={17} strokeWidth={2} aria-hidden="true" />
              </span>
              <h2
                id="telemetry-history-title"
                className="truncate text-lg font-semibold text-ecoplaza-text"
              >
                {t("sensors.historyModalTitle")}
              </h2>
            </div>
            <p className="mt-1 truncate text-xs text-ecoplaza-text-muted">
              {t("sensors.historyModalSubtitle", { name: containerName })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("sensors.closeHistory")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Contenido principal según estado */}
        <div className="flex-1 overflow-hidden pt-4">
          {isLoading ? (
            <div
              role="status"
              className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-ecoplaza-text-muted"
            >
              <LoaderCircle
                className="animate-spin text-ecoplaza-primary"
                size={24}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>{t("sensors.historyLoading")}</span>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex min-h-64 flex-col items-center justify-center text-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={22} strokeWidth={2} aria-hidden="true" />
              </span>
              <h4 className="mt-3 text-sm font-semibold text-ecoplaza-text">
                {t(error)}
              </h4>
              <button
                type="button"
                onClick={() => void loadHistory(true)}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-ecoplaza-border px-3.5 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
                <span>{t("containers.retry")}</span>
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ecoplaza-background text-ecoplaza-text-muted">
                <Radio size={24} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h4 className="mt-4 text-sm font-semibold text-ecoplaza-text">
                {t("sensors.noHistory")}
              </h4>
              <p className="mt-1 max-w-sm text-xs text-ecoplaza-text-muted">
                {t("sensors.historyModalSubtitle", { name: containerName })}
              </p>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-ecoplaza-border bg-ecoplaza-surface text-[11px] font-semibold uppercase tracking-wider text-ecoplaza-text-muted">
                  <tr>
                    <th scope="col" className="pb-3 pr-3">
                      {t("sensors.historyColDate")}
                    </th>
                    <th scope="col" className="px-3 pb-3">
                      {t("sensors.historyColFill")}
                    </th>
                    <th scope="col" className="px-3 pb-3">
                      {t("sensors.historyColBattery")}
                    </th>
                    <th scope="col" className="pb-3 pl-3">
                      {t("sensors.historyColTemperature")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ecoplaza-border/50 text-xs">
                  {history.map((record) => {
                    const isCritical = record.fillLevelPercent > 80;
                    const fillValue = Math.min(
                      Math.max(0, record.fillLevelPercent),
                      100,
                    );

                    return (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-ecoplaza-background/50"
                      >
                        <td className="py-3 pr-3 font-medium text-ecoplaza-text">
                          {formatHistoryDate(record.recordedAt, locale)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ecoplaza-background">
                              <div
                                className={`h-full rounded-full ${
                                  isCritical
                                    ? "bg-ecoplaza-danger"
                                    : "bg-ecoplaza-primary"
                                }`}
                                style={{ width: `${fillValue}%` }}
                              />
                            </div>
                            <span
                              className={`font-semibold ${
                                isCritical
                                  ? "text-ecoplaza-danger"
                                  : "text-ecoplaza-text"
                              }`}
                            >
                              {record.fillLevelPercent}%
                            </span>
                            {isCritical && (
                              <span className="rounded-full bg-ecoplaza-danger/15 px-2 py-0.5 text-[10px] font-semibold text-ecoplaza-danger">
                                {t("sensors.alertStatus")}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 text-ecoplaza-text">
                            {getBatteryIcon(record.batteryLevelPercent)}
                            <span className="font-medium">
                              {record.batteryLevelPercent}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-1.5 text-ecoplaza-text">
                            <Thermometer
                              size={15}
                              className="shrink-0 text-ecoplaza-text-muted"
                              aria-hidden="true"
                            />
                            <span className="font-medium">
                              {record.temperatureCelsius !== null &&
                              record.temperatureCelsius !== undefined
                                ? `${record.temperatureCelsius} °C`
                                : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="mt-4 flex justify-end border-t border-ecoplaza-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-semibold text-ecoplaza-text transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
          >
            {t("sensors.closeHistory")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SensorTelemetryHistoryModal;

