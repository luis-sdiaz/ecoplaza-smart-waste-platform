import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";
import type { Buyer } from "../services/buyerService";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface DeleteBuyerModalProps {
  buyers: Buyer[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (buyerId: string) => void;
}

export default function DeleteBuyerModal({
  buyers,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteBuyerModalProps) {
  const { t } = useTranslation();

  // Filtrar compradores elegibles (aquellos sin compras asociadas)
  const eligibleBuyers = useMemo(
    () => buyers.filter((b) => (b.purchaseCount ?? 0) === 0),
    [buyers],
  );

  const [selectedId, setSelectedId] = useState<string>(
    () => eligibleBuyers[0]?.id ?? "",
  );

  const dialogRef = useDialogFocus(onClose, !isDeleting);

  const handleConfirm = () => {
    if (!selectedId || isDeleting) return;
    onConfirm(selectedId);
  };

  const selectedBuyer = eligibleBuyers.find((b) => b.id === selectedId);

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
        aria-labelledby="delete-buyer-title"
        aria-describedby="delete-buyer-description"
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
                id="delete-buyer-title"
                data-testid="delete-buyer-modal-title"
                className="text-lg font-semibold text-ecoplaza-text"
              >
                {t("buyers.deleteBuyerModalTitle", "Eliminar comprador")}
              </h2>
              <p className="text-xs text-ecoplaza-text-muted">
                {t(
                  "buyers.deleteBuyerModalSubtitle",
                  "Elimina de forma segura un comprador que no tenga ventas vinculadas.",
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
            id="delete-buyer-description"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300"
          >
            <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>
              {t(
                "buyers.deleteBuyerIntegrityNotice",
                "Solo pueden eliminarse compradores sin historial de compras para preservar los registros comerciales.",
              )}
            </span>
          </div>

          {eligibleBuyers.length === 0 ? (
            <p className="py-4 text-center text-sm text-ecoplaza-text-muted">
              {t(
                "buyers.noDeletableBuyers",
                "No hay compradores sin historial de compras disponibles para eliminar.",
              )}
            </p>
          ) : (
            <div>
              <label
                htmlFor="delete-buyer-select"
                className="block text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70"
              >
                {t("buyers.selectBuyerToDelete", "Selecciona el comprador a eliminar")}
              </label>
              <select
                id="delete-buyer-select"
                data-testid="delete-buyer-select"
                value={selectedId}
                disabled={isDeleting}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eligibleBuyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {`BUY-${b.id.slice(0, 8).toUpperCase()} — ${b.name}`}
                  </option>
                ))}
              </select>

              {selectedBuyer && (
                <div className="mt-3 rounded-xl border border-ecoplaza-border/60 bg-ecoplaza-background/60 p-3 text-xs text-ecoplaza-text-muted">
                  <p className="font-medium text-ecoplaza-text">
                    {t(
                      "buyers.confirmDeleteBuyerPrompt",
                      "¿Estás seguro de que deseas eliminar este comprador? Esta acción no se puede deshacer.",
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-ecoplaza-text">BUY-{selectedBuyer.id.slice(0, 8).toUpperCase()}</span>
                    {" • "}
                    <span>{selectedBuyer.name}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-ecoplaza-border pt-4">
          <button
            type="button"
            data-testid="cancel-delete-buyer-button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("buyers.cancel", "Cancelar")}
          </button>
          <button
            type="button"
            data-testid="confirm-delete-buyer-button"
            disabled={isDeleting || !selectedId || eligibleBuyers.length === 0}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            )}
            <span>
              {isDeleting
                ? t("buyers.deletingBuyer", "Eliminando comprador...")
                : t("buyers.deleteBuyerConfirm", "Eliminar comprador")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

