import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";
import type { SaleHistoryItem } from "../services/salesService";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";

interface DeleteSaleModalProps {
  sales: SaleHistoryItem[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (saleId: string) => void;
}

export default function DeleteSaleModal({
  sales,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteSaleModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const [selectedId, setSelectedId] = useState<string>(() => sales[0]?.id ?? "");

  const dialogRef = useDialogFocus(onClose, !isDeleting);

  const handleConfirm = () => {
    if (!selectedId || isDeleting) return;
    onConfirm(selectedId);
  };

  const selectedSale = sales.find((s) => s.id === selectedId);

  const translateCategory = (category: string) => {
    if (category === "organic") return t("common.organic", "Orgánicos");
    if (category === "recyclable") return t("common.recyclable", "Reciclables");
    return t("common.nonRecyclable", "No reciclable");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sale-title"
        aria-describedby="delete-sale-description"
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-600">
              <Trash2 size={20} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="delete-sale-title"
                data-testid="delete-sale-modal-title"
                className="text-lg font-semibold text-ecoplaza-text"
              >
                {t("sales.deleteSaleModalTitle", "Eliminar venta")}
              </h2>
              <p className="text-xs text-ecoplaza-text-muted">
                {t(
                  "sales.deleteSaleModalSubtitle",
                  "Elimina una venta registrada y reincorpora el residuo al inventario disponible.",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div
            id="delete-sale-description"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300"
          >
            <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>
              {t(
                "sales.deleteSaleIntegrityNotice",
                "Al eliminar esta venta, el residuo volverá a estar disponible en el inventario activo.",
              )}
            </span>
          </div>

          {sales.length === 0 ? (
            <p className="py-4 text-center text-sm text-ecoplaza-text-muted">
              {t("sales.noDeletableSales", "No hay ventas registradas disponibles para eliminar.")}
            </p>
          ) : (
            <div>
              <label
                htmlFor="delete-sale-select"
                className="block text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70"
              >
                {t("sales.selectSaleToDelete", "Selecciona la venta a eliminar")}
              </label>
              <select
                id="delete-sale-select"
                data-testid="delete-sale-select"
                value={selectedId}
                disabled={isDeleting}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`SAL-${s.id.slice(0, 8).toUpperCase()} — ${s.buyerName} — ${currencyFormatter.format(s.totalValue)}`}
                  </option>
                ))}
              </select>

              {selectedSale && (
                <div className="mt-3 rounded-xl border border-ecoplaza-border/60 bg-ecoplaza-background/60 p-3 text-xs text-ecoplaza-text-muted space-y-2">
                  <p className="font-medium text-ecoplaza-text">
                    {t(
                      "sales.confirmDeleteSalePrompt",
                      "¿Estás seguro de que deseas eliminar esta venta? El residuo volverá al inventario activo.",
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-ecoplaza-border/40 text-xs">
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("sales.sale", "Venta")}:</span>{" "}
                      <span className="font-semibold text-ecoplaza-text font-mono">
                        SAL-{selectedSale.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("buyers.buyer", "Comprador")}:</span>{" "}
                      <span className="font-medium text-ecoplaza-text">{selectedSale.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("common.material", "Material")}:</span>{" "}
                      <span className="text-ecoplaza-text">{translateCategory(selectedSale.category)}</span>
                      <span className="ml-1 text-ecoplaza-text-muted">
                        ({`RES-${selectedSale.wasteRecordNumber.padStart(3, "0")}`})
                      </span>
                    </div>
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("sales.soldWeight", "Peso")}:</span>{" "}
                      <span className="font-medium text-ecoplaza-text">
                        {numberFormatter.format(selectedSale.weightKg)} {t("common.kg", "kg")}
                      </span>
                    </div>
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("sales.total", "Total")}:</span>{" "}
                      <span className="font-semibold text-ecoplaza-text">
                        {currencyFormatter.format(selectedSale.totalValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-ecoplaza-text-muted">{t("common.date", "Fecha")}:</span>{" "}
                      <span className="text-ecoplaza-text">
                        {dateFormatter.format(new Date(selectedSale.soldAt))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-ecoplaza-border pt-4">
          <button
            type="button"
            data-testid="cancel-delete-sale-button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("sales.cancel", "Cancelar")}
          </button>
          <button
            type="button"
            data-testid="confirm-delete-sale-button"
            disabled={isDeleting || !selectedId || sales.length === 0}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            )}
            <span>
              {isDeleting
                ? t("sales.deletingSale", "Eliminando venta...")
                : t("sales.deleteSaleConfirm", "Eliminar venta")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

