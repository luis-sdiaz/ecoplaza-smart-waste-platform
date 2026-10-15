import { ChartNoAxesCombined } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { ReportSalesTrendItem } from "../services/reportService";

interface SalesTrendChartProps {
  data: ReportSalesTrendItem[];
  isFiltered: boolean;
}

function SalesTrendChart({ data, isFiltered }: SalesTrendChartProps) {
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
  const maximumCount = Math.max(0, ...data.map((item) => item.salesCount));
  const maximumRevenue = Math.max(0, ...data.map((item) => item.grossSalesValue));

  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{t("reports.salesTrend")}</h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("reports.salesTrendDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ecoplaza-text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ecoplaza-primary" />{t("reports.trendSales")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ecoplaza-secondary" />{t("reports.trendRevenue")}</span>
          <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold">
            {t(isFiltered ? "reports.filteredData" : "reports.realData")}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center">
          <ChartNoAxesCombined size={26} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("reports.emptySalesTrendTitle")}</h3>
          <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t(isFiltered ? "reports.emptySalesTrendPeriodDescription" : "reports.emptySalesTrendDescription")}</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-max items-end gap-3" role="img" aria-label={t("reports.salesTrendAriaLabel")}>
            {data.map((item) => {
              const date = new Date(`${item.date}T00:00:00`);
              const countHeight = maximumCount === 0 ? 0 : (item.salesCount / maximumCount) * 144;
              const revenueHeight = maximumRevenue === 0 ? 0 : (item.grossSalesValue / maximumRevenue) * 144;
              const accessibleSummary = t("reports.salesTrendPoint", {
                date: dateFormatter.format(date),
                count: countFormatter.format(item.salesCount),
                revenue: currencyFormatter.format(item.grossSalesValue),
              });

              return (
                <div key={item.date} className="w-24 shrink-0" aria-label={accessibleSummary}>
                  <div className="mb-2 text-center text-[11px] text-ecoplaza-text-muted">
                    <span className="block font-semibold text-ecoplaza-text">{countFormatter.format(item.salesCount)}</span>
                    <span className="block truncate" title={currencyFormatter.format(item.grossSalesValue)}>{currencyFormatter.format(item.grossSalesValue)}</span>
                  </div>
                  <div className="flex h-40 items-end justify-center gap-2 rounded-lg bg-ecoplaza-background px-3 pt-3">
                    <div className="w-5 rounded-t bg-ecoplaza-primary" style={{ height: `${Math.max(3, countHeight)}px` }} />
                    <div className="w-5 rounded-t bg-ecoplaza-secondary" style={{ height: `${Math.max(3, revenueHeight)}px` }} />
                  </div>
                  <p className="mt-2 text-center text-[11px] font-medium text-ecoplaza-text-muted">{dateFormatter.format(date)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

export default SalesTrendChart;
