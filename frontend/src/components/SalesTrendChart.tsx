import { ChartNoAxesCombined, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";

export interface SalesTrendDataPoint {
  date?: string;
  salesCount?: number;
  grossSalesValue?: number;
  period?: string;
  label?: string;
  count?: number;
  revenue?: number;
  weight?: number;
  weightKg?: number;
}

export interface SalesTrendChartProps {
  data?: readonly SalesTrendDataPoint[];
  isFiltered?: boolean;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

function SalesTrendChart({
  data = [],
  isFiltered = false,
  isLoading = false,
  title,
  subtitle,
  className = "",
  role,
  ariaLabel,
  testId = "sales-trend-chart",
}: SalesTrendChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const countFormatter = new Intl.NumberFormat(locale);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Normalización resiliente de los puntos cronológicos de datos
  const normalizedItems = data.map((item, index) => {
    let periodLabel: string;
    if (typeof item.period === "string" && item.period.trim() !== "") {
      periodLabel = item.period;
    } else if (typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      const dateObj = new Date(`${item.date}T00:00:00`);
      periodLabel = Number.isNaN(dateObj.getTime())
        ? item.date
        : dateFormatter.format(dateObj);
    } else if (typeof item.date === "string" && item.date.trim() !== "") {
      periodLabel = item.date;
    } else if (typeof item.label === "string" && item.label.trim() !== "") {
      periodLabel = item.label;
    } else {
      periodLabel = `#${index + 1}`;
    }

    const count =
      typeof item.salesCount === "number" && !Number.isNaN(item.salesCount)
        ? Math.max(0, item.salesCount)
        : typeof item.count === "number" && !Number.isNaN(item.count)
          ? Math.max(0, item.count)
          : typeof item.weight === "number" && !Number.isNaN(item.weight)
            ? Math.max(0, item.weight)
            : typeof item.weightKg === "number" && !Number.isNaN(item.weightKg)
              ? Math.max(0, item.weightKg)
              : 0;

    const revenue =
      typeof item.grossSalesValue === "number" && !Number.isNaN(item.grossSalesValue)
        ? Math.max(0, item.grossSalesValue)
        : typeof item.revenue === "number" && !Number.isNaN(item.revenue)
          ? Math.max(0, item.revenue)
          : 0;

    return {
      id: item.date ?? item.period ?? item.label ?? `point-${index}`,
      periodLabel,
      count,
      revenue,
      rawItem: item,
    };
  });

  const maximumCount = Math.max(0, ...normalizedItems.map((item) => item.count));
  const maximumRevenue = Math.max(0, ...normalizedItems.map((item) => item.revenue));

  const displayTitle = title ?? t("reports.salesTrend");
  const displaySubtitle = subtitle ?? t("reports.salesTrendDescription");
  const cardRole = role ?? "region";
  const cardAriaLabel = ariaLabel ?? displayTitle;

  return (
    <article
      data-testid={testId}
      role={cardRole}
      aria-label={cardAriaLabel}
      className={`glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-200 ${className}`}
    >
      {/* Encabezado y Leyenda */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{displayTitle}</h2>
          {displaySubtitle && (
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{displaySubtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ecoplaza-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-ecoplaza-primary" />
            {t("reports.trendSales")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-ecoplaza-secondary" />
            {t("reports.trendRevenue")}
          </span>
          <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
            {t(isFiltered ? "reports.filteredData" : "reports.realData")}
          </span>
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading ? (
        <div
          role="status"
          className="mt-6 flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span>{t("reports.loadingSalesTrend")}</span>
        </div>
      ) : normalizedItems.length === 0 ? (
        /* Estado vacío */
        <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center">
          <ChartNoAxesCombined
            size={26}
            strokeWidth={1.8}
            className="text-ecoplaza-primary"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
            {t("reports.emptySalesTrendTitle")}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">
            {t(
              isFiltered
                ? "reports.emptySalesTrendPeriodDescription"
                : "reports.emptySalesTrendDescription",
            )}
          </p>
        </div>
      ) : (
        /* Visualización Gráfica y Representación Accesible */
        <>
          {/* Tabla accesible oculta para lectores de pantalla */}
          <div className="sr-only">
            <table aria-label={t("reports.salesTrendAriaLabel")}>
              <caption>{displayTitle}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("reports.month")}</th>
                  <th scope="col">{t("reports.trendSales")}</th>
                  <th scope="col">{t("reports.trendRevenue")}</th>
                </tr>
              </thead>
              <tbody>
                {normalizedItems.map((item, idx) => (
                  <tr key={idx}>
                    <th scope="row">{item.periodLabel}</th>
                    <td>{countFormatter.format(item.count)}</td>
                    <td>{currencyFormatter.format(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico visual responsivo */}
          <div className="mt-6 overflow-x-auto pb-2">
            <div
              className="flex min-w-max items-end gap-3"
              role="img"
              aria-label={t("reports.salesTrendAriaLabel")}
            >
              {normalizedItems.map((item) => {
                const countRatio = maximumCount > 0 ? item.count / maximumCount : 0;
                const revenueRatio =
                  maximumRevenue > 0 ? item.revenue / maximumRevenue : 0;
                const countHeight = countRatio * 144;
                const revenueHeight = revenueRatio * 144;
                const accessibleSummary = t("reports.salesTrendPoint", {
                  date: item.periodLabel,
                  count: countFormatter.format(item.count),
                  revenue: currencyFormatter.format(item.revenue),
                });

                return (
                  <div
                    key={item.id}
                    className="w-24 shrink-0"
                    aria-label={accessibleSummary}
                  >
                    <div className="mb-2 text-center text-[11px] text-ecoplaza-text-muted">
                      <span className="block font-semibold text-ecoplaza-text">
                        {countFormatter.format(item.count)}
                      </span>
                      <span
                        className="block truncate"
                        title={currencyFormatter.format(item.revenue)}
                      >
                        {currencyFormatter.format(item.revenue)}
                      </span>
                    </div>
                    <div className="flex h-40 items-end justify-center gap-2 rounded-lg bg-ecoplaza-background px-3 pt-3">
                      <div
                        className="w-5 rounded-t bg-ecoplaza-primary transition-all duration-300"
                        style={{ height: `${Math.max(3, countHeight)}px` }}
                      />
                      <div
                        className="w-5 rounded-t bg-ecoplaza-secondary transition-all duration-300"
                        style={{ height: `${Math.max(3, revenueHeight)}px` }}
                      />
                    </div>
                    <p className="mt-2 text-center text-[11px] font-medium text-ecoplaza-text-muted">
                      {item.periodLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default SalesTrendChart;
