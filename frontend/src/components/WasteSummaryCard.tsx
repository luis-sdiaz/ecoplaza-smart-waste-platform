import { LoaderCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface WasteSummaryCardProps {
  // Mode A: Resumen Global Cuantitativo
  totalWeight?: number;
  organicWeight?: number;
  recyclableWeight?: number;
  nonRecyclableWeight?: number;
  trendPercentage?: number;
  periodLabel?: string;
  isLoading?: boolean;
  className?: string;

  // Mode B: Tarjeta de Categoría Individual (Retrocompatibilidad con DashboardPage)
  title?: string;
  amount?: string;
  percentage?: number;
  percentageLabel?: string;
}

function WasteSummaryCard({
  totalWeight,
  organicWeight,
  recyclableWeight,
  nonRecyclableWeight,
  trendPercentage,
  periodLabel,
  isLoading = false,
  className = "",
  title,
  amount,
  percentage,
  percentageLabel,
}: WasteSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language || "es";
  const locale = currentLang.startsWith("en") ? "en-US" : "es-CO";

  // Formateadores numéricos
  const formatWeight = (val: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 1,
      maximumFractionDigits: 2,
    }).format(val);
    return `${formatted} ${t("common.kg", "kg")}`;
  };

  const formatPercentage = (val: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(val);
    return `${formatted}%`;
  };

  // Modo B: Tarjeta individual por categoría (retrocompatibilidad con DashboardPage)
  if (totalWeight === undefined && organicWeight === undefined && amount !== undefined) {
    const safePercentage = typeof percentage === "number" && !Number.isNaN(percentage) ? percentage : 0;
    const displayPercentage = percentageLabel ?? `${safePercentage}%`;

    return (
      <article
        className={`glass-card group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {displayPercentage}
          </span>
        </div>

        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{amount}</p>

        <div
          role="progressbar"
          aria-valuenow={Math.round(safePercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title ?? ""}: ${displayPercentage}`}
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, safePercentage))}%` }}
          />
        </div>
      </article>
    );
  }

  // Modo A: Resumen Global Cuantitativo
  const safeTotalWeight = typeof totalWeight === "number" && !Number.isNaN(totalWeight) ? totalWeight : 0;
  const safeOrganicWeight = typeof organicWeight === "number" && !Number.isNaN(organicWeight) ? organicWeight : 0;
  const safeRecyclableWeight =
    typeof recyclableWeight === "number" && !Number.isNaN(recyclableWeight) ? recyclableWeight : 0;
  const safeNonRecyclableWeight =
    typeof nonRecyclableWeight === "number" && !Number.isNaN(nonRecyclableWeight) ? nonRecyclableWeight : 0;
  const safeTrend = typeof trendPercentage === "number" && !Number.isNaN(trendPercentage) ? trendPercentage : undefined;

  const organicPct = safeTotalWeight > 0 ? (safeOrganicWeight / safeTotalWeight) * 100 : 0;
  const recyclablePct = safeTotalWeight > 0 ? (safeRecyclableWeight / safeTotalWeight) * 100 : 0;
  const nonRecyclablePct = safeTotalWeight > 0 ? (safeNonRecyclableWeight / safeTotalWeight) * 100 : 0;

  const cardTitle = title ?? t("waste.summaryTitle", "Resumen de residuos");

  return (
    <article
      className={`glass-card rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 transition-all duration-200 shadow-sm ${className}`}
      aria-label={cardTitle}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ecoplaza-text-muted">
          {cardTitle}
        </h3>

        {safeTrend !== undefined && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                safeTrend >= 0
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {safeTrend >= 0 ? (
                <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <TrendingDown size={14} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />
              )}
              <span>{formatPercentage(Math.abs(safeTrend))}</span>
              <span className="sr-only">
                {safeTrend >= 0
                  ? t("common.increase", "Incremento")
                  : t("common.decrease", "Reducción")}
              </span>
            </span>
            {periodLabel && (
              <span className="text-xs text-ecoplaza-text-muted">{periodLabel}</span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          className="flex min-h-[160px] flex-col items-center justify-center gap-2 py-8 text-ecoplaza-text-muted"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span className="text-sm">{t("common.loading", "Cargando...")}</span>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-3xl font-extrabold tracking-tight text-ecoplaza-text">
              {formatWeight(safeTotalWeight)}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Orgánicos */}
            <div className="flex flex-col rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {t("common.organic", "Orgánicos")}
                </span>
                <span className="text-xs text-ecoplaza-text-muted">
                  {formatPercentage(organicPct)}
                </span>
              </div>
              <span className="mt-2 text-lg font-bold text-ecoplaza-text">
                {formatWeight(safeOrganicWeight)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(organicPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${t("common.organic", "Orgánicos")}: ${formatPercentage(organicPct)}`}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ecoplaza-border"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, organicPct))}%` }}
                />
              </div>
            </div>

            {/* Reciclables */}
            <div className="flex flex-col rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                  {t("common.recyclable", "Reciclables")}
                </span>
                <span className="text-xs text-ecoplaza-text-muted">
                  {formatPercentage(recyclablePct)}
                </span>
              </div>
              <span className="mt-2 text-lg font-bold text-ecoplaza-text">
                {formatWeight(safeRecyclableWeight)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(recyclablePct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${t("common.recyclable", "Reciclables")}: ${formatPercentage(recyclablePct)}`}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ecoplaza-border"
              >
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, recyclablePct))}%` }}
                />
              </div>
            </div>

            {/* No aprovechables */}
            <div className="flex flex-col rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {t("common.nonRecyclable", "No aprovechables")}
                </span>
                <span className="text-xs text-ecoplaza-text-muted">
                  {formatPercentage(nonRecyclablePct)}
                </span>
              </div>
              <span className="mt-2 text-lg font-bold text-ecoplaza-text">
                {formatWeight(safeNonRecyclableWeight)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(nonRecyclablePct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${t("common.nonRecyclable", "No aprovechables")}: ${formatPercentage(nonRecyclablePct)}`}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ecoplaza-border"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, nonRecyclablePct))}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default WasteSummaryCard;
