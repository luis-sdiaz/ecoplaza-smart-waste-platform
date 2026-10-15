import { useTranslation } from "react-i18next";
import type { ContainerStockSummary } from "../services/coreWorkflow";

type ContainerStockSummaryTableProps = {
  summaries: readonly ContainerStockSummary[];
};

function ContainerStockSummaryTable({ summaries }: ContainerStockSummaryTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(weightKg)} ${t("common.kg")}`;

  if (summaries.length === 0) {
    return (
      <div className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-sm text-ecoplaza-text-muted">
        {t("inventory.noRegisteredContainers")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full min-w-150">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.container")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.availableWeight")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.availableRecords")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.stockStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => {
            const hasStock = summary.availableRecordCount > 0;
            return (
              <tr key={summary.containerId} className="border-t border-ecoplaza-border">
                <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">{summary.containerCode}</td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">{formatWeight(summary.availableWeightKg)}</td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">{summary.availableRecordCount}</td>
                <td className="px-5 py-4 text-sm">
                  <span className={hasStock
                    ? "rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-xs font-medium text-ecoplaza-primary"
                    : "rounded-full bg-ecoplaza-background px-2.5 py-1 text-xs font-medium text-ecoplaza-text-muted"}
                  >
                    {t(hasStock ? "inventory.withStock" : "inventory.withoutStock")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ContainerStockSummaryTable;
