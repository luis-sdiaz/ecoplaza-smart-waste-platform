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
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">
          {t("sales.recentSales", "Ventas recientes")}
        </caption>
        <thead className="bg-slate-50/75 dark:bg-slate-800/60">
          <tr>
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("sales.sale", "Venta")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("buyers.buyer", "Comprador")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("common.material", "Material")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("sales.soldWeight", "Peso vendido")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("sales.unitPrice", "Precio por kg")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("sales.total", "Total")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("common.date", "Fecha")}
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("sales.actions", "Acciones")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-3 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
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
                className="px-3 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                {t("sales.noSales", "No hay ventas registradas")}
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40" title={sale.notes}>
                <td className="px-3 py-3.5 font-mono text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap" title={sale.id}>
                  {`SAL-${sale.id.slice(0, 8).toUpperCase()}`}
                </td>
                <td className="px-3 py-3.5 text-sm font-medium text-slate-800 dark:text-slate-100" title={sale.buyerName}>
                  {sale.buyerName}
                </td>
                <td className="px-3 py-3.5 text-left">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                      sale.category,
                    )}`}
                  >
                    {translateCategory(sale.category)}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {numberFormatter.format(sale.weightKg)} {t("common.kg", "kg")}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {currencyFormatter.format(sale.unitPrice)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-sm font-bold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                  {currencyFormatter.format(sale.totalValue)}
                </td>
                <td className="px-3 py-3.5 text-left text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {dateFormatter.format(new Date(sale.soldAt))}
                </td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(sale)}
                    aria-label={`${t("sales.viewDetails", "Ver detalle")} - ${sale.buyerName}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Eye size={13} aria-hidden="true" />
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
