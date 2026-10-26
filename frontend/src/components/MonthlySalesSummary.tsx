import type { KeyboardEvent } from "react";
import {
  CalendarDays,
  DollarSign,
  LoaderCircle,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { ReportMonthlySalesItem } from "../services/reportService";

export interface MonthlySalesSummaryProps {
  data?: readonly ReportMonthlySalesItem[];
  isFiltered?: boolean;
  totalRevenue?: number | null;
  totalWeight?: number | null;
  totalWeightKg?: number | null;
  averagePricePerKg?: number | null;
  trendPercentage?: number | null;
  periodLabel?: string;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

function MonthlySalesSummary({
  data = [],
  isFiltered = false,
  totalRevenue,
  totalWeight,
  totalWeightKg,
  averagePricePerKg,
  trendPercentage,
  periodLabel,
  isLoading = false,
  onClick,
  className = "",
  role,
  ariaLabel,
  testId = "monthly-sales-summary",
}: MonthlySalesSummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const weightFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const percentageFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });

  const hasSales = data.some((item) => item.salesCount > 0);

  const hasKpiProps =
    totalRevenue !== undefined ||
    totalWeight !== undefined ||
    totalWeightKg !== undefined ||
    averagePricePerKg !== undefined ||
    trendPercentage !== undefined ||
    periodLabel !== undefined;

  const safeRevenue =
    typeof totalRevenue === "number" && !Number.isNaN(totalRevenue)
      ? Math.max(0, totalRevenue)
      : totalRevenue === 0
        ? 0
        : null;

  const effectiveWeight = totalWeight ?? totalWeightKg;
  const safeWeight =
    typeof effectiveWeight === "number" && !Number.isNaN(effectiveWeight)
      ? Math.max(0, effectiveWeight)
      : effectiveWeight === 0
        ? 0
        : null;

  const safeAvgPrice =
    typeof averagePricePerKg === "number" && !Number.isNaN(averagePricePerKg)
      ? Math.max(0, averagePricePerKg)
      : averagePricePerKg === 0
        ? 0
        : null;

  const safeTrend =
    typeof trendPercentage === "number" && !Number.isNaN(trendPercentage)
      ? trendPercentage
      : null;

  const displayTitle = periodLabel
    ? `${t("reports.monthlySales")} · ${periodLabel}`
    : t("reports.monthlySales");

  const isInteractive = typeof onClick === "function";
  const cardRole = role ?? (isInteractive ? "button" : "region");
  const cardAriaLabel =
    ariaLabel ??
    (periodLabel
      ? `${t("reports.monthlySales")} - ${periodLabel}`
      : t("reports.monthlySales"));

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      data-testid={testId}
      role={cardRole}
      aria-label={cardAriaLabel}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-200 ${
        isInteractive
          ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ecoplaza-primary focus-visible:outline-offset-2"
          : ""
      } ${className}`}
    >
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{displayTitle}</h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("reports.monthlySalesDescription")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.filteredData" : "reports.realData")}
        </span>
      </div>

      {/* Estado de carga */}
      {isLoading ? (
        <div
          role="status"
          className="mt-6 flex min-h-32 flex-col items-center justify-center gap-2 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span>{t("reports.loadingMonthlySummary")}</span>
        </div>
      ) : (
        <>
          {/* Grilla de Métricas de Rendimiento Comercial (KPIs) */}
          {hasKpiProps && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* 1. Ingresos Monetarios Totales */}
              {safeRevenue !== null && (
                <div className="glass-card flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ecoplaza-text-muted">
                      {t("reports.totalRevenueTitle")}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <DollarSign size={18} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                      {currencyFormatter.format(safeRevenue)}
                    </p>
                    {safeTrend !== null && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                        {safeTrend > 0 ? (
                          <TrendingUp
                            size={16}
                            className="text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : safeTrend < 0 ? (
                          <TrendingDown
                            size={16}
                            className="text-rose-600 dark:text-rose-400"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span
                          className={
                            safeTrend > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : safeTrend < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-ecoplaza-text-muted"
                          }
                        >
                          {safeTrend > 0 ? "+" : ""}
                          {percentageFormatter.format(safeTrend)}%
                        </span>
                        <span className="sr-only">
                          {safeTrend > 0
                            ? t("reports.monthlyTrendIncrease", {
                                value: percentageFormatter.format(safeTrend),
                              })
                            : safeTrend < 0
                              ? t("reports.monthlyTrendDecrease", {
                                  value: percentageFormatter.format(Math.abs(safeTrend)),
                                })
                              : t("reports.monthlyTrendNeutral")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Peso Total Comercializado */}
              {safeWeight !== null && (
                <div className="glass-card flex flex-col justify-between rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ecoplaza-text-muted">
                      {t("reports.totalWeightSold")}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <Scale size={18} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                      {weightFormatter.format(safeWeight)}{" "}
                      <span className="text-xs font-normal text-ecoplaza-text-muted">
                        {t("common.kg")}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Precio Promedio por Kilogramo */}
              {safeAvgPrice !== null && (
                <div className="glass-card flex flex-col justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ecoplaza-text-muted">
                      {t("reports.averagePriceTitle")}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <DollarSign size={18} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                      {currencyFormatter.format(safeAvgPrice)}{" "}
                      <span className="text-xs font-normal text-ecoplaza-text-muted">
                        / {t("common.kg")}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado vacío cuando no hay ventas en modo tabla y no se pasaron KPIs */}
          {!hasSales && !hasKpiProps && (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-xl bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted"
            >
              <CalendarDays
                size={20}
                className="mt-0.5 shrink-0 text-ecoplaza-primary"
                aria-hidden="true"
              />
              <span>
                {t(
                  isFiltered
                    ? "reports.emptyMonthlySalesPeriod"
                    : "reports.emptyMonthlySales",
                )}
              </span>
            </div>
          )}

          {/* Tabla Desglosada Cronológica */}
          {data.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-ecoplaza-text-muted">
                    <th
                      scope="col"
                      className="border-b border-ecoplaza-border px-4 py-3 font-semibold"
                    >
                      {t("reports.month")}
                    </th>
                    <th
                      scope="col"
                      className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold"
                    >
                      {t("reports.salesCount")}
                    </th>
                    <th
                      scope="col"
                      className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold"
                    >
                      {t("reports.grossSales")}
                    </th>
                    <th
                      scope="col"
                      className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold"
                    >
                      {t("reports.revenueChange")}
                    </th>
                    <th
                      scope="col"
                      className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold"
                    >
                      {t("reports.averagePerOperation")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.month} className="text-ecoplaza-text">
                      <th
                        scope="row"
                        className="border-b border-ecoplaza-border px-4 py-3 font-medium capitalize"
                      >
                        {monthFormatter.format(new Date(`${item.month}-01T00:00:00`))}
                      </th>
                      <td className="border-b border-ecoplaza-border px-4 py-3 text-right">
                        {numberFormatter.format(item.salesCount)}
                      </td>
                      <td className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">
                        {currencyFormatter.format(item.grossSalesValue)}
                      </td>
                      <td className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">
                        {item.revenueChangePercentage === null ? (
                          <span className="text-ecoplaza-text-muted">—</span>
                        ) : (
                          <span
                            className={
                              item.revenueChangePercentage > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : item.revenueChangePercentage < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-ecoplaza-text-muted"
                            }
                          >
                            {item.revenueChangePercentage > 0 ? "+" : ""}
                            {percentageFormatter.format(item.revenueChangePercentage)}%
                          </span>
                        )}
                      </td>
                      <td className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold text-ecoplaza-primary">
                        {currencyFormatter.format(item.averageSaleValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default MonthlySalesSummary;
