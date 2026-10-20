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
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ecoplaza-text">{name}</p>
          <p className="mt-1 text-xs text-ecoplaza-text-muted">{category}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !isDataAvailable
              ? "bg-ecoplaza-background text-ecoplaza-text-muted border border-ecoplaza-border"
              : isCritical
              ? "bg-ecoplaza-danger/15 text-ecoplaza-danger border border-ecoplaza-danger/30"
              : "bg-ecoplaza-background text-ecoplaza-primary"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ecoplaza-text-muted">{t("sensors.fillLevel")}</span>
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
            style={{ width: validFillLevel !== null ? `${validFillLevel}%` : "0%" }}
          />
        </div>
      </div>
    </article>
  );
}

export default SensorStatusCard;
