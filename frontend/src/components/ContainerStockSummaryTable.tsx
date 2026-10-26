import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ContainerStockSummary } from "../services/coreWorkflow";

export interface ContainerStockSummaryTableProps {
  summaries?: readonly ContainerStockSummary[];
  isLoading?: boolean;
  title?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

function ContainerStockSummaryTable({
  summaries = [],
  isLoading = false,
  title,
  className,
  role,
  ariaLabel,
  testId,
}: ContainerStockSummaryTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(weightKg)} ${t("common.kg", "kg")}`;

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid={testId ? `${testId}-loading` : "container-stock-summary-loading"}
        className={`flex min-h-32 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 text-center text-sm text-ecoplaza-text-muted ${className ?? ""}`.trim()}
      >
        <LoaderCircle
          className="h-6 w-6 animate-spin text-ecoplaza-primary"
          aria-hidden="true"
        />
        <span className="mt-2 text-xs font-medium text-ecoplaza-text-muted">
          {t("inventory.loadingStockSummary", "Cargando resumen de existencias por contenedor...")}
        </span>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div
        role={role}
        aria-label={ariaLabel}
        data-testid={testId ? `${testId}-empty` : undefined}
        className={`rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-sm text-ecoplaza-text-muted ${className ?? ""}`.trim()}
      >
        {t("inventory.noRegisteredContainers")}
      </div>
    );
  }

  const regionLabel = ariaLabel ?? title ?? t("inventory.stockSummaryTitle", "Resumen de existencias por contenedor");
  const captionLabel = t("inventory.stockSummaryTableCaption", "Resumen de existencias y peso disponible por contenedor");

  return (
    <div
      role={role ?? "region"}
      aria-label={regionLabel}
      tabIndex={0}
      data-testid={testId}
      className={`overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary ${className ?? ""}`.trim()}
    >
      <table className="w-full min-w-150">
        <caption className="sr-only">{captionLabel}</caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.container")}</th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.availableWeight")}</th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.availableRecords")}</th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.stockStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => {
            const hasStock = summary.availableRecordCount > 0;
            return (
              <tr key={summary.containerId} className="border-t border-ecoplaza-border">
                <th scope="row" className="px-5 py-4 text-left text-sm font-medium text-ecoplaza-text">{summary.containerCode}</th>
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
