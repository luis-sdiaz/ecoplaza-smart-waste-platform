import {
  AlertTriangle,
  Battery,
  BatteryMedium,
  BatteryWarning,
  ExternalLink,
  History,
  LoaderCircle,
  Radio,
  Scale,
  Thermometer,
  Wifi,
  Zap,
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
  onManageContainer?: (containerId: string) => void;
  onSimulateTelemetry?: (containerId: string) => void;
  isLoading?: boolean;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
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
  onManageContainer,
  onSimulateTelemetry,
  isLoading = false,
  className,
  role,
  ariaLabel,
  testId,
}: SensorDeviceCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <article
        role="status"
        aria-live="polite"
        aria-label={ariaLabel ?? t("sensors.loadingCard", "Cargando información del sensor...")}
        data-testid={testId ? `${testId}-loading` : "sensor-device-card-loading"}
        className={`glass-card flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-200/70 p-6 text-center dark:border-white/10 ${className ?? ""}`.trim()}
      >
        <LoaderCircle className="h-6 w-6 animate-spin text-emerald-500" aria-hidden="true" />
        <span className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {t("sensors.loadingCard", "Cargando información del sensor...")}
        </span>
      </article>
    );
  }

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
    ? "border-slate-300/60 bg-slate-500/10 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
    : isCritical
    ? "border-rose-300/60 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300"
    : "border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";

  const getBatteryIcon = (level: number | null | undefined) => {
    if (level === null || level === undefined || Number.isNaN(level)) {
      return (
        <Battery
          className="shrink-0 text-slate-400"
          size={14}
          aria-hidden="true"
        />
      );
    }
    if (level <= 20) {
      return (
        <BatteryWarning
          className="shrink-0 text-rose-500 animate-pulse"
          size={14}
          aria-hidden="true"
        />
      );
    }
    if (level <= 50) {
      return (
        <BatteryMedium
          className="shrink-0 text-amber-500"
          size={14}
          aria-hidden="true"
        />
      );
    }
    return (
      <Battery
        className="shrink-0 text-emerald-500"
        size={14}
        aria-hidden="true"
      />
    );
  };

  const cardRole = role ?? "region";
  const cardLabel = ariaLabel ?? name;

  return (
    <article
      role={cardRole}
      aria-label={cardLabel}
      data-testid={testId}
      className={`glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ease-out transform-gpu hover:scale-[1.03] hover:-translate-y-1.5 hover:z-20 hover:shadow-2xl hover:shadow-emerald-500/15 border border-slate-200/70 dark:border-white/10 hover:border-emerald-500/40 flex flex-col justify-between ${className ?? ""}`.trim()}
    >
      <div>
        {/* Encabezado: Código del contenedor y Badge translúcido con micro-punto */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="truncate text-base font-bold text-slate-900 dark:text-slate-100"
              title={name}
            >
              {name}
            </h3>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
              {sensorId}
            </p>
            {category && (
              <span className="mt-1.5 inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {category}
              </span>
            )}
          </div>

          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md shadow-2xs ${statusBadgeClass}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                !isDataAvailable
                  ? "bg-slate-400"
                  : isCritical
                  ? "animate-ping bg-rose-500"
                  : "bg-emerald-500"
              }`}
              aria-hidden="true"
            />
            {displayStatus}
          </span>
        </div>

        {/* Sección de nivel de llenado y barra de progreso */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400">
              {t("sensors.fillLevel")}
            </span>
            <span
              className={`font-bold ${
                isCritical
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {validFillLevel !== null ? `${validFillLevel}%` : "—"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={t("sensors.fillLevel")}
            aria-valuenow={validFillLevel !== null ? validFillLevel : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={
              validFillLevel !== null
                ? `${validFillLevel}%`
                : t("sensors.noTelemetry")
            }
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !isDataAvailable
                  ? "w-0 bg-slate-400"
                  : isCritical
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{
                width: validFillLevel !== null ? `${validFillLevel}%` : "0%",
              }}
            />
          </div>

          {isCritical && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
              <span>{t("sensors.criticalFillAlert")}</span>
              <span className="sr-only">
                {t("sensors.criticalAlertDescription", "Alerta crítica: capacidad por encima del 80%")}
              </span>
            </div>
          )}

          {!isDataAvailable && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              <Radio
                className="shrink-0 text-slate-400"
                size={14}
                aria-hidden="true"
              />
              <span>{t("sensors.noTelemetry")}</span>
            </div>
          )}
        </div>

        {/* Micro-Píldoras de Telemetría (Tag Pills) estilo Data Sources */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Píldora de Batería */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors duration-150">
            {getBatteryIcon(batteryLevel)}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("sensors.battery")}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isDataAvailable &&
              batteryLevel !== null &&
              batteryLevel !== undefined &&
              !Number.isNaN(batteryLevel)
                ? `${batteryLevel}%`
                : "—"}
            </span>
          </span>

          {/* Píldora de Temperatura */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors duration-150">
            <Thermometer
              size={14}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("sensors.temperature")}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {isDataAvailable &&
              temperatureCelsius !== null &&
              temperatureCelsius !== undefined &&
              !Number.isNaN(temperatureCelsius)
                ? `${temperatureCelsius} °C`
                : "—"}
            </span>
          </span>

          {/* Píldora de Peso (si existe) */}
          {weight !== undefined && weight !== null && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors duration-150">
              <Scale size={14} className="shrink-0 text-emerald-500" aria-hidden="true" />
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {t("sensors.registeredWeight")}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {weight} kg
              </span>
            </span>
          )}

          {/* Píldora de Conexión / Última lectura */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors duration-150">
            <Wifi size={13} className="shrink-0 text-emerald-500" aria-hidden="true" />
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {t("sensors.lastReading")}:
            </span>
            <span
              className="max-w-[140px] truncate font-medium text-slate-900 dark:text-slate-100"
              title={lastUpdate || ""}
            >
              {lastUpdate || (isDataAvailable ? "—" : t("sensors.noTelemetry"))}
            </span>
          </span>
        </div>
      </div>

      {/* Botones de acción inferiores */}
      {(onViewHistory || onSimulateTelemetry || onManageContainer) && (
        <div
          className={`mt-5 grid gap-2 border-t border-slate-200/60 dark:border-white/10 pt-3 ${
            [onViewHistory, onSimulateTelemetry, onManageContainer].filter(Boolean).length === 3
              ? "grid-cols-3"
              : [onViewHistory, onSimulateTelemetry, onManageContainer].filter(Boolean).length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              aria-label={t("sensors.viewHistoryFor", { name })}
            >
              <History
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="truncate">{t("sensors.viewHistory")}</span>
            </button>
          )}

          {onSimulateTelemetry && (
            <button
              type="button"
              onClick={() => onSimulateTelemetry(sensorId)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              aria-label={t("sensors.simulateCardAriaLabel", { name })}
            >
              <Zap
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="truncate">{t("sensors.simulateCardAction")}</span>
            </button>
          )}

          {onManageContainer && (
            <button
              type="button"
              onClick={() => onManageContainer(sensorId)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              aria-label={t("sensors.manageContainerAriaLabel", { name })}
            >
              <ExternalLink
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="truncate">{t("sensors.manageContainer")}</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default SensorDeviceCard;
