import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { SaleHistoryItem } from "../services/salesService";

interface SalesTableProps {
  sales: SaleHistoryItem[];
  onViewDetails: (sale: SaleHistoryItem) => void;
}

function SalesTable({ sales, onViewDetails }: SalesTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const translateCategory = (value: SaleHistoryItem["category"]): string =>
    value === "organic"
      ? t("common.organic")
      : value === "recyclable"
        ? t("common.recyclable")
        : t("common.nonRecyclable");

  return (
    <div className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full min-w-[980px]">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.sale")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("buyers.buyer")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("common.material")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.soldWeight")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.unitPrice")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.total")}</th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("common.date")}</th>
            <th className="px-5 py-4 text-right text-xs font-semibold text-ecoplaza-text-muted">{t("sales.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text" title={sale.id}>
                {`SAL-${sale.id.slice(0, 8).toUpperCase()}`}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text">{sale.buyerName}</td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                <span className="block">{translateCategory(sale.category)}</span>
                <span className="mt-1 block text-xs text-ecoplaza-text-muted">
                  {`RES-${sale.wasteRecordNumber.padStart(3, "0")}`}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {numberFormatter.format(sale.weightKg)} {t("common.kg")}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {currencyFormatter.format(sale.unitPrice)}
              </td>
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {currencyFormatter.format(sale.totalValue)}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {dateFormatter.format(new Date(sale.soldAt))}
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onViewDetails(sale)}
                  className="inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary"
                >
                  <Eye size={15} aria-hidden="true" />
                  {t("sales.viewDetails")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesTable;
