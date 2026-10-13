import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReportCategoryDistributionItem } from "../services/reportService";

interface WasteDistributionChartProps {
  data: ReportCategoryDistributionItem[];
  isFiltered?: boolean;
}

function WasteDistributionChart({ data, isFiltered = false }: WasteDistributionChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const weightFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const percentageFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });
  const hasRegisteredWaste = data.some((item) => item.weightKg > 0);

  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("reports.distribution")}
          </h2>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("reports.distributionDescription")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.filteredData" : "reports.realData")}
        </span>
      </div>

      {hasRegisteredWaste ? (
        <div className="mt-6 space-y-5">
          {data.map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ecoplaza-text">
                    {t(`common.${item.category}`)}
                  </p>
                  <p className="mt-1 text-xs text-ecoplaza-text-muted">
                    {weightFormatter.format(item.weightKg)} {t("common.kg")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ecoplaza-primary">
                  {percentageFormatter.format(item.percentage)}%
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-ecoplaza-background">
                <div
                  className="h-full rounded-full bg-ecoplaza-secondary"
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center">
          <Database
            size={24}
            strokeWidth={1.8}
            className="text-ecoplaza-primary"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
            {t(isFiltered ? "reports.emptyPeriodDistributionTitle" : "reports.emptyDistributionTitle")}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">
            {t(isFiltered ? "reports.emptyPeriodDistributionDescription" : "reports.emptyDistributionDescription")}
          </p>
        </div>
      )}
    </article>
  );
}

export default WasteDistributionChart;
