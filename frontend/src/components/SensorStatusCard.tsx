import type { KeyboardEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SensorStatusCardProps {
  name: string;
  category: string;
  fillLevel?: number | null;
  status: string;
  hasTelemetry?: boolean;
  batteryLevel?: number | null;
  temperature?: number | null;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  role?: string;
  "aria-label"?: string;
}

function SensorStatusCard({
  name,
  category,
  fillLevel,
  status,
  hasTelemetry,
  isLoading = false,
  onClick,
  className = "",
  role,
  "aria-label": ariaLabel,
}: SensorStatusCardProps) {
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

  const isCritical =
    (validFillLevel !== null && validFillLevel > 80) ||
    (typeof status === "string" && status.toLowerCase() === "critical");

  const isWarning =
    !isCritical &&
    ((validFillLevel !== null && validFillLevel >= 70 && validFillLevel <= 80) ||
      (typeof status === "string" && status.toLowerCase() === "warning"));

  const isInteractive = typeof onClick === "function";
  const cardRole = role ?? (isInteractive ? "button" : "region");
  const cardAriaLabel = ariaLabel ?? `${name} - ${category}`;

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      role={cardRole}
      aria-label={cardAriaLabel}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`glass-card group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        isInteractive
          ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-ecoplaza-primary focus-visible:outline-offset-2"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {category}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs backdrop-blur-md ${
            !isDataAvailable
              ? "border border-slate-300/60 bg-slate-500/10 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              : isCritical
                ? "border border-red-300/60 bg-red-500/10 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
                : isWarning
                  ? "border border-amber-300/60 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                  : "border border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !isDataAvailable
                ? "bg-slate-400"
                : isCritical
                  ? "animate-pulse bg-red-600"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
          <span>{status}</span>
          {isCritical && (
            <span className="sr-only">
              {t("sensors.criticalLevel", "Alerta crítica: nivel de llenado superior al 80%")}
            </span>
          )}
          {isWarning && (
            <span className="sr-only">
              {t("sensors.warningLevel", "Advertencia: nivel de llenado entre 70% y 80%")}
            </span>
          )}
        </span>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex min-h-[50px] items-center justify-center gap-2 py-3 text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={20}
            aria-hidden="true"
          />
          <span className="text-xs font-medium">
            {t("common.loading", "Cargando telemetría...")}
          </span>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {t("sensors.fillLevel", "Nivel de llenado")}
            </span>
            <span
              className={`font-bold ${
                isCritical
                  ? "text-red-600 dark:text-red-400"
                  : isWarning
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {validFillLevel !== null ? `${validFillLevel}%` : "—"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={validFillLevel !== null ? Math.round(validFillLevel) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${t("sensors.fillLevel", "Nivel de llenado")}: ${
              validFillLevel !== null ? `${validFillLevel}%` : t("sensors.noTelemetry", "Sin telemetría reciente")
            }`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/60"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !isDataAvailable
                  ? "w-0 bg-zinc-400"
                  : isCritical
                    ? "bg-red-600 dark:bg-red-500"
                    : isWarning
                      ? "bg-amber-500 dark:bg-amber-400"
                      : "bg-emerald-700 dark:bg-emerald-600"
              }`}
              style={{
                width: validFillLevel !== null ? `${validFillLevel}%` : "0%",
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default SensorStatusCard;
