import { History, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Buyer } from "../services/buyerService";

interface BuyerTableProps {
  buyers: Buyer[];
  onEdit: (buyer: Buyer) => void;
  onViewHistory: (buyer: Buyer) => void;
}

function BuyerTable({ buyers, onEdit, onViewHistory }: BuyerTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));

  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.code")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.buyer")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.email")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.phone")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.updatedAt")}
            </th>
            <th className="px-5 py-4 text-right text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.actions")}
            </th>
          </tr>
        </thead>

        <tbody>
          {buyers.map((buyer) => (
            <tr key={buyer.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text" title={buyer.id}>
                {`BUY-${buyer.id.slice(0, 8).toUpperCase()}`}
              </td>
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {buyer.name}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {buyer.email ?? t("buyers.notProvided")}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {buyer.phone ?? t("buyers.notProvided")}
              </td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {formatDate(buyer.updatedAt)}
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onViewHistory(buyer)}
                  aria-label={t("buyers.viewPurchaseHistoryLabel", { name: buyer.name })}
                  className="mr-2 inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary"
                >
                  <History size={14} strokeWidth={1.8} aria-hidden="true" />
                  {t("buyers.history")}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(buyer)}
                  aria-label={t("buyers.editBuyerLabel", { name: buyer.name })}
                  className="inline-flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                >
                  <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
                  {t("buyers.edit")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BuyerTable;
