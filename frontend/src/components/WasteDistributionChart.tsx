import { useMemo } from "react";
import { Database, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface WasteDistributionItem {
  category: string;
  weightKg?: number;
  weight?: number;
  percentage?: number;
}

export interface WasteDistributionChartProps {
  data?: WasteDistributionItem[];
  isFiltered?: boolean;
  isLoading?: boolean;
  organicWeight?: number;
  recyclableWeight?: number;
  nonRecyclableWeight?: number;
  title?: string;
  description?: string;
  className?: string;
}

function WasteDistributionChart({
  data,
  isFiltered = false,
  isLoading = false,
  organicWeight,
  recyclableWeight,
  nonRecyclableWeight,
  title,
  description,
  className = "",
}: WasteDistributionChartProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language || "es";
  const locale = currentLang.startsWith("en") ? "en-US" : "es-CO";

  const weightFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const percentageFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  const getCategoryLabel = (category: string): string => {
    if (category === "organic") return t("common.organic", "Orgánicos");
    if (category === "recyclable") return t("common.recyclable", "Reciclables");
    if (category === "nonRecyclable") return t("common.nonRecyclable", "No aprovechables");
    return category;
  };

  const getCategoryColor = (category: string): string => {
    if (category === "organic") return "bg-emerald-500";
    if (category === "recyclable") return "bg-blue-500";
    return "bg-amber-500";
  };

  const getCategoryBadgeClass = (category: string): string => {
    if (category === "organic") {
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    }
    if (category === "recyclable") {
      return "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    }
    return "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  };

  const normalizedItems = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      const total = data.reduce(
        (acc, item) => acc + (item.weightKg ?? item.weight ?? 0),
        0,
      );
      return data.map((item) => {
        const weight = item.weightKg ?? item.weight ?? 0;
        const percentage =
          typeof item.percentage === "number"
            ? item.percentage
            : total > 0
              ? (weight / total) * 100
              : 0;
        return {
          category: item.category,
          weight,
          percentage,
        };
      });
    }

    if (
      organicWeight !== undefined ||
      recyclableWeight !== undefined ||
      nonRecyclableWeight !== undefined
    ) {
      const oW = organicWeight ?? 0;
      const rW = recyclableWeight ?? 0;
      const nW = nonRecyclableWeight ?? 0;
      const total = oW + rW + nW;
      return [
        {
          category: "organic",
          weight: oW,
          percentage: total > 0 ? (oW / total) * 100 : 0,
        },
        {
          category: "recyclable",
          weight: rW,
          percentage: total > 0 ? (rW / total) * 100 : 0,
        },
        {
          category: "nonRecyclable",
          weight: nW,
          percentage: total > 0 ? (nW / total) * 100 : 0,
        },
      ];
    }

    return [];
  }, [data, organicWeight, recyclableWeight, nonRecyclableWeight]);

  const hasRegisteredWaste =
    normalizedItems.length > 0 && normalizedItems.some((item) => item.weight > 0);

  const cardTitle = title ?? t("reports.distribution", "Distribución de residuos");
  const cardDescription =
    description ??
    t(
      "reports.distributionDescription",
      "Proporción y peso total de residuos gestionados por categoría.",
    );

  return (
    <article
      role="region"
      aria-label={cardTitle}
      className={`rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {cardTitle}
          </h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {cardDescription}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(
            isFiltered ? "reports.filteredData" : "reports.realData",
            isFiltered ? "Período filtrado" : "Datos reales",
          )}
        </span>
      </div>

      {/* Leyenda cromática de categorías */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-ecoplaza-border/50 pb-3 text-xs font-medium text-ecoplaza-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{t("common.organic", "Orgánicos")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />
          <span>{t("common.recyclable", "Reciclables")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
          <span>{t("common.nonRecyclable", "No aprovechables")}</span>
        </div>
      </div>

      {isLoading ? (
        <div
          className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center text-ecoplaza-text-muted"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span className="mt-3 text-sm font-medium">
            {t("common.loading", "Cargando distribución de residuos...")}
          </span>
        </div>
      ) : hasRegisteredWaste ? (
        <>
          {/* Representación visual de las barras de distribución */}
          <div className="mt-6 space-y-5">
            {normalizedItems.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                        item.category,
                      )}`}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs text-ecoplaza-text-muted">
                      {weightFormatter.format(item.weight)} {t("common.kg", "kg")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-ecoplaza-primary">
                    {percentageFormatter.format(item.percentage)}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={Math.round(item.percentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${getCategoryLabel(item.category)}: ${percentageFormatter.format(
                    item.percentage,
                  )}%`}
                  className="mt-2 h-3 overflow-hidden rounded-full bg-ecoplaza-background"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getCategoryColor(
                      item.category,
                    )}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Representación textual accesible para tecnologías asistivas */}
          <div className="sr-only">
            <h4>
              {t(
                "reports.distributionAccessibleSummary",
                "Resumen accesible de distribución de residuos",
              )}
            </h4>
            <ul>
              {normalizedItems.map((item) => (
                <li key={item.category}>
                  {getCategoryLabel(item.category)}:{" "}
                  {weightFormatter.format(item.weight)} {t("common.kg", "kg")},{" "}
                  {percentageFormatter.format(item.percentage)}%
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center">
          <Database
            size={24}
            strokeWidth={1.8}
            className="text-ecoplaza-primary"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
            {t(
              isFiltered
                ? "reports.emptyPeriodDistributionTitle"
                : "reports.emptyDistributionTitle",
              "Sin datos de distribución registrados",
            )}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">
            {t(
              isFiltered
                ? "reports.emptyPeriodDistributionDescription"
                : "reports.emptyDistributionDescription",
              "La distribución por categoría aparecerá al registrar nuevos residuos.",
            )}
          </p>
        </div>
      )}
    </article>
  );
}

export default WasteDistributionChart;
