import {
  AlertTriangle,
  Battery,
  BatteryMedium,
  BatteryWarning,
  History,
  Radio,
  Thermometer,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SensorDeviceCardProps {
  name: string;
  sensorId: string;
  category?: string;
  fillLevel?: number | null;
  weight?: number | null;
  status?: string;
  lastUpdate?: string | null;
  batteryLevel?: number | null;
  temperatureCelsius?: number | null;
  hasTelemetry?: boolean;
  onViewHistory?: () => void;
}

function SensorDeviceCard({
  name,
  sensorId,
  category,
  fillLevel,
  weight,
  status,
  lastUpdate,
  batteryLevel,
  temperatureCelsius,
  hasTelemetry,
  onViewHistory,
}: SensorDeviceCardProps) {
  const { t } = useTranslation();

  const isDataAvailable =
    hasTelemetry ??
    (fillLevel !== undefined &&
      fillLevel !== null &&
      !Number.isNaN(fillLevel) &&
      typeof fillLevel === "number");

  const validFillLevel =
    isDataAvailable && typeof fillLevel === "number" && !Number.isNaN(fillLevel)
      ? Math.min(Math.max(0, fillLevel), 100)
      : null;

  const isCritical = validFillLevel !== null && validFillLevel > 80;

  const defaultStatus = isDataAvailable
    ? isCritical
      ? t("sensors.alertStatus")
      : t("common.active")
    : t("sensors.waitingSignal");

  const displayStatus = status ?? defaultStatus;

  const statusBadgeClass = !isDataAvailable
    ? "bg-ecoplaza-background text-ecoplaza-text-muted border border-ecoplaza-border"
    : isCritical
    ? "bg-ecoplaza-danger/15 text-ecoplaza-danger border border-ecoplaza-danger/30 font-semibold"
    : "bg-ecoplaza-background text-ecoplaza-primary";

  const getBatteryIcon = (level: number | null | undefined) => {
    if (level === null || level === undefined || Number.isNaN(level)) {
      return (
        <Battery
          className="shrink-0 text-ecoplaza-text-muted"
          size={16}
          aria-hidden="true"
        />
      );
    }
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
    <article className="flex flex-col justify-between rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              className="truncate text-base font-semibold text-ecoplaza-text"
              title={name}
            >
              {name}
            </h3>
            <p className="mt-1 break-all font-mono text-xs text-ecoplaza-text-muted">
              {sensorId}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass}`}
          >
            {displayStatus}
          </span>
        </div>

        <div className="mt-4">
          {category && (
            <p className="text-sm text-ecoplaza-text-muted">{category}</p>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ecoplaza-text-muted">
              {t("sensors.fillLevel")}
            </span>
            <span
              className={`font-semibold ${
                isCritical ? "text-ecoplaza-danger" : "text-ecoplaza-text"
              }`}
            >
              {validFillLevel !== null ? `${validFillLevel}%` : "—"}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ecoplaza-background">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !isDataAvailable
                  ? "w-0 bg-ecoplaza-border"
                  : isCritical
                  ? "bg-ecoplaza-danger"
                  : "bg-ecoplaza-primary"
              }`}
              style={{
                width: validFillLevel !== null ? `${validFillLevel}%` : "0%",
              }}
            />
          </div>

          {isCritical && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ecoplaza-danger">
              <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
              <span>{t("sensors.criticalFillAlert")}</span>
            </div>
          )}

          {!isDataAvailable && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-ecoplaza-border bg-ecoplaza-background/70 px-3 py-2 text-xs text-ecoplaza-text-muted">
              <Radio
                className="shrink-0 text-ecoplaza-text-muted"
                size={14}
                aria-hidden="true"
              />
              <span>{t("sensors.noTelemetry")}</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ecoplaza-border/60 pt-3">
            <div className="flex items-center gap-2">
              {getBatteryIcon(batteryLevel)}
              <div>
                <p className="text-[11px] text-ecoplaza-text-muted">
                  {t("sensors.battery")}
                </p>
                <p className="text-xs font-semibold text-ecoplaza-text">
                  {isDataAvailable &&
                  batteryLevel !== null &&
                  batteryLevel !== undefined &&
                  !Number.isNaN(batteryLevel)
                    ? `${batteryLevel}%`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Thermometer
                size={16}
                className="shrink-0 text-ecoplaza-text-muted"
                aria-hidden="true"
              />
              <div>
                <p className="text-[11px] text-ecoplaza-text-muted">
                  {t("sensors.temperature")}
                </p>
                <p className="text-xs font-semibold text-ecoplaza-text">
                  {isDataAvailable &&
                  temperatureCelsius !== null &&
                  temperatureCelsius !== undefined &&
                  !Number.isNaN(temperatureCelsius)
                    ? `${temperatureCelsius} °C`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mt-4 flex items-center justify-between border-t border-ecoplaza-border/60 pt-3 text-xs">
          {weight !== undefined && weight !== null ? (
            <div>
              <p className="text-xs text-ecoplaza-text-muted">
                {t("sensors.registeredWeight")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ecoplaza-text">
                {weight} kg
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-ecoplaza-text-muted">
                {t("sensors.lastReading")}
              </p>
            </div>
          )}

          <div className="text-right">
            {weight !== undefined && weight !== null && (
              <p className="text-xs text-ecoplaza-text-muted">
                {t("sensors.lastReading")}
              </p>
            )}
            <p
              className="mt-0.5 max-w-[180px] truncate text-xs font-medium text-ecoplaza-text"
              title={lastUpdate || ""}
            >
              {lastUpdate || (isDataAvailable ? "—" : t("sensors.noTelemetry"))}
            </p>
          </div>
        </div>

        {onViewHistory && (
          <div className="mt-3 border-t border-ecoplaza-border/60 pt-3">
            <button
              type="button"
              onClick={onViewHistory}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-ecoplaza-border bg-ecoplaza-background/50 px-3 py-2 text-xs font-semibold text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:bg-ecoplaza-background hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              aria-label={t("sensors.viewHistoryFor", { name })}
            >
              <History
                size={14}
                className="shrink-0 text-ecoplaza-primary"
                aria-hidden="true"
              />
              <span>{t("sensors.viewHistory")}</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default SensorDeviceCard;
