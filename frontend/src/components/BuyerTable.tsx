import { History, LoaderCircle, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Buyer } from "../services/buyerService";

export interface BuyerTableProps {
  buyers: Buyer[];
  onEdit?: (buyer: Buyer) => void;
  onViewHistory?: (buyer: Buyer) => void;
  onViewPurchases?: (buyer: Buyer) => void;
  isLoading?: boolean;
}

function BuyerTable({
  buyers,
  onEdit,
  onViewHistory,
  onViewPurchases,
  isLoading = false,
}: BuyerTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "-"
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  };

  const isBuyerActive = (buyer: Buyer & { status?: string }) => {
    if (buyer.status) {
      const s = buyer.status.toLowerCase();
      return s === "active" || s === "activo";
    }
    return true;
  };

  const handleViewHistory = (buyer: Buyer) => {
    if (onViewHistory) {
      onViewHistory(buyer);
    } else if (onViewPurchases) {
      onViewPurchases(buyer);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full min-w-[900px]">
        <caption className="sr-only">
          {t("buyers.recordsDescription", "Directorio y gestión de compradores")}
        </caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.code", "Código")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.buyer", "Comprador")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.documentNumber", "Documento / NIT")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.email", "Correo")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.phone", "Teléfono")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.status", "Estado")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.updatedAt", "Actualizado")}
            </th>
            <th scope="col" className="px-5 py-4 text-right text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.actions", "Acciones")}
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted">
                <div className="flex items-center justify-center gap-2" role="status">
                  <LoaderCircle className="h-5 w-5 animate-spin text-ecoplaza-primary" aria-hidden="true" />
                  <span>{t("buyers.loading", "Cargando tus compradores...")}</span>
                </div>
              </td>
            </tr>
          ) : buyers.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted"
              >
                {t("buyers.noBuyers", "No hay compradores registrados")}
              </td>
            </tr>
          ) : (
            buyers.map((buyer) => (
              <tr key={buyer.id} className="border-t border-ecoplaza-border" title={buyer.address}>
                <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text" title={buyer.id}>
                  {`BUY-${buyer.id.slice(0, 8).toUpperCase()}`}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                  {buyer.name}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {buyer.documentNumber || t("buyers.notProvided", "No registrado")}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {buyer.email ?? t("buyers.notProvided", "No registrado")}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {buyer.phone ?? t("buyers.notProvided", "No registrado")}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isBuyerActive(buyer)
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {isBuyerActive(buyer)
                      ? t("common.active", "Activo")
                      : t("common.inactive", "Inactivo")}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {formatDate(buyer.updatedAt)}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleViewHistory(buyer)}
                    aria-label={t("buyers.viewPurchaseHistoryLabel", `Ver historial de compras de ${buyer.name}`)}
                    className="mr-2 inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <History size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span>{t("buyers.history", "Historial")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(buyer)}
                    aria-label={t("buyers.editBuyerLabel", `Editar a ${buyer.name}`)}
                    className="inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span>{t("buyers.edit", "Editar")}</span>
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

export default BuyerTable;
