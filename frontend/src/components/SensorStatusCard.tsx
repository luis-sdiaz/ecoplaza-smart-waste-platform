import { useTranslation } from "react-i18next";

export interface SensorStatusCardProps {
  name: string;
  category: string;
  fillLevel?: number | null;
  status: string;
  hasTelemetry?: boolean;
}

function SensorStatusCard({
  name,
  category,
  fillLevel,
  status,
  hasTelemetry,
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

  const isCritical = validFillLevel !== null && validFillLevel > 80;

  return (
    <article className="glass-card group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{category}</p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs backdrop-blur-md ${
            !isDataAvailable
              ? "border border-slate-300/60 bg-slate-500/10 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              : isCritical
              ? "border border-rose-300/60 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300"
              : "border border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !isDataAvailable
                ? "bg-slate-400"
                : isCritical
                ? "animate-pulse bg-rose-500"
                : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
          {status}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t("sensors.fillLevel")}</span>
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

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              !isDataAvailable
                ? "w-0 bg-slate-400"
                : isCritical
                ? "bg-gradient-to-r from-amber-500 to-rose-500"
                : "bg-gradient-to-r from-emerald-500 to-teal-400"
            }`}
            style={{ width: validFillLevel !== null ? `${validFillLevel}%` : "0%" }}
          />
        </div>
      </div>
    </article>
  );
}

export default SensorStatusCard;
