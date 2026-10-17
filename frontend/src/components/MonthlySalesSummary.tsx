import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { ReportMonthlySalesItem } from "../services/reportService";

interface MonthlySalesSummaryProps {
  data: readonly ReportMonthlySalesItem[];
  isFiltered: boolean;
}

function MonthlySalesSummary({ data, isFiltered }: MonthlySalesSummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const hasSales = data.some((item) => item.salesCount > 0);

  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{t("reports.monthlySales")}</h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("reports.monthlySalesDescription")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.filteredData" : "reports.realData")}
        </span>
      </div>

      {!hasSales && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-xl bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted">
          <CalendarDays size={20} className="mt-0.5 shrink-0 text-ecoplaza-primary" aria-hidden="true" />
          <span>{t(isFiltered ? "reports.emptyMonthlySalesPeriod" : "reports.emptyMonthlySales")}</span>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-ecoplaza-text-muted">
                <th scope="col" className="border-b border-ecoplaza-border px-4 py-3 font-semibold">{t("reports.month")}</th>
                <th scope="col" className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">{t("reports.salesCount")}</th>
                <th scope="col" className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">{t("reports.grossSales")}</th>
                <th scope="col" className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">{t("reports.averagePerOperation")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.month} className="text-ecoplaza-text">
                  <th scope="row" className="border-b border-ecoplaza-border px-4 py-3 font-medium capitalize">
                    {monthFormatter.format(new Date(`${item.month}-01T00:00:00`))}
                  </th>
                  <td className="border-b border-ecoplaza-border px-4 py-3 text-right">{numberFormatter.format(item.salesCount)}</td>
                  <td className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold">{currencyFormatter.format(item.grossSalesValue)}</td>
                  <td className="border-b border-ecoplaza-border px-4 py-3 text-right font-semibold text-ecoplaza-primary">{currencyFormatter.format(item.averageSaleValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default MonthlySalesSummary;
