import { AlertTriangle, Database, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { Buyer } from "../services/buyerService";
import type { SaleHistoryItem } from "../services/salesService";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface BuyerPurchaseHistoryModalProps {
  buyer: Buyer;
  sales: SaleHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

function BuyerPurchaseHistoryModal({
  buyer,
  sales,
  isLoading,
  error,
  onRetry,
  onClose,
}: BuyerPurchaseHistoryModalProps) {
  const { t, i18n } = useTranslation();
  const dialogRef = useDialogFocus(onClose);
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="buyer-history-title">
      <section className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ecoplaza-border p-5">
          <div>
            <h2 id="buyer-history-title" className="text-lg font-semibold text-ecoplaza-text">{t("buyers.purchaseHistoryTitle")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("buyers.purchaseHistoryDescription", { name: buyer.name })}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("buyers.closePurchaseHistory")} className="rounded-lg p-2 text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[calc(85vh-92px)] overflow-auto p-5">
          {isLoading ? (
            <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} aria-hidden="true" />
              {t("buyers.loadingPurchaseHistory")}
            </div>
          ) : error !== null ? (
            <div role="alert" className="flex min-h-48 flex-col items-center justify-center text-center">
              <AlertTriangle className="text-ecoplaza-danger" size={24} aria-hidden="true" />
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(error)}</p>
              <button type="button" onClick={onRetry} className="mt-4 flex items-center gap-2 rounded-lg border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text">
                <RefreshCw size={15} aria-hidden="true" />{t("buyers.retry")}
              </button>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <Database className="text-ecoplaza-primary" size={24} aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("buyers.noPurchasesTitle")}</h3>
              <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("buyers.noPurchasesDescription")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ecoplaza-border">
              <table className="w-full min-w-[680px]">
                <thead className="bg-ecoplaza-background">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("common.date")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("common.material")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.soldWeight")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("sales.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-ecoplaza-border">
                      <td className="px-4 py-3 text-sm text-ecoplaza-text-muted">{dateFormatter.format(new Date(sale.soldAt))}</td>
                      <td className="px-4 py-3 text-sm text-ecoplaza-text">{t(`common.${sale.category}`)}</td>
                      <td className="px-4 py-3 text-sm text-ecoplaza-text">{numberFormatter.format(sale.weightKg)} {t("common.kg")}</td>
                      <td className="px-4 py-3 text-sm font-medium text-ecoplaza-text">{currencyFormatter.format(sale.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default BuyerPurchaseHistoryModal;
