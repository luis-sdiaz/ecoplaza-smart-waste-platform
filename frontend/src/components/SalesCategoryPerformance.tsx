import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { ReportSalesCategoryItem } from "../services/reportService";

type SalesCategoryPerformanceProps = {
  data: readonly ReportSalesCategoryItem[];
  isFiltered: boolean;
};

function SalesCategoryPerformance({ data, isFiltered }: SalesCategoryPerformanceProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale);
  const weightFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const hasSales = data.some((item) => item.salesCount > 0);

  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{t("reports.salesByCategory")}</h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("reports.salesByCategoryDescription")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.filteredData" : "reports.realData")}
        </span>
      </div>

      {!hasSales && (
        <p role="status" className="mt-5 rounded-xl bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.emptySalesByCategoryPeriod" : "reports.emptySalesByCategory")}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {data.map((item) => (
          <section key={item.category} className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-4">
            <h3 className="font-semibold text-ecoplaza-text">{t(`common.${item.category}`)}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ecoplaza-text-muted">{t("reports.categorySalesCount")}</dt>
                <dd className="font-semibold text-ecoplaza-text">{numberFormatter.format(item.salesCount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ecoplaza-text-muted">{t("reports.categorySoldWeight")}</dt>
                <dd className="font-semibold text-ecoplaza-text">{weightFormatter.format(item.soldWeightKg)} {t("common.kg")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ecoplaza-text-muted">{t("reports.categoryGrossRevenue")}</dt>
                <dd className="text-right font-semibold text-ecoplaza-primary">{currencyFormatter.format(item.grossSalesValue)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ecoplaza-text-muted">{t("reports.categoryAveragePrice")}</dt>
                <dd className="text-right font-semibold text-ecoplaza-primary">{currencyFormatter.format(item.averagePricePerKg)} / {t("common.kg")}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}

export default SalesCategoryPerformance;
