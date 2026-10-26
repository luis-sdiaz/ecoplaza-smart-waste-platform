import { Eye, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { SaleHistoryItem } from "../services/salesService";

export interface SalesTableProps {
  sales: SaleHistoryItem[];
  onViewDetails?: (sale: SaleHistoryItem) => void;
  isLoading?: boolean;
}

function SalesTable({ sales, onViewDetails, isLoading = false }: SalesTableProps) {
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
      ? t("common.organic", "Orgánicos")
      : value === "recyclable"
        ? t("common.recyclable", "Reciclables")
        : t("common.nonRecyclable", "No reciclable");

  const getCategoryBadgeClass = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized === "organic" || normalized === "orgánicos" || normalized === "organicos") {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    }
    if (normalized === "recyclable" || normalized === "reciclables") {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
    }
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full min-w-[980px]">
        <caption className="sr-only">
          {t("sales.recentSales", "Ventas recientes")}
        </caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.sale", "Venta")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.buyer", "Comprador")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.material", "Material")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.soldWeight", "Peso vendido")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.unitPrice", "Precio unitario")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.total", "Total")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.date", "Fecha")}
            </th>
            <th scope="col" className="px-5 py-4 text-right text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.actions", "Acciones")}
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted">
                <div className="flex items-center justify-center gap-2" role="status">
                  <LoaderCircle className="h-5 w-5 animate-spin text-ecoplaza-primary" aria-hidden="true" />
                  <span>{t("sales.loading", "Cargando ventas...")}</span>
                </div>
              </td>
            </tr>
          ) : sales.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted"
              >
                {t("sales.noSales", "No hay ventas registradas")}
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="border-t border-ecoplaza-border" title={sale.notes}>
                <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text" title={sale.id}>
                  {`SAL-${sale.id.slice(0, 8).toUpperCase()}`}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">{sale.buyerName}</td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                      sale.category,
                    )}`}
                  >
                    {translateCategory(sale.category)}
                  </span>
                  <span className="mt-1 block text-xs text-ecoplaza-text-muted">
                    {`RES-${sale.wasteRecordNumber.padStart(3, "0")}`}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  {numberFormatter.format(sale.weightKg)} {t("common.kg", "kg")}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {currencyFormatter.format(sale.unitPrice)}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-ecoplaza-text">
                  {currencyFormatter.format(sale.totalValue)}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {dateFormatter.format(new Date(sale.soldAt))}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(sale)}
                    aria-label={`${t("sales.viewDetails", "Ver detalle")} - ${sale.buyerName}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <Eye size={15} aria-hidden="true" />
                    <span>{t("sales.viewDetails", "Ver detalle")}</span>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SalesTable;
