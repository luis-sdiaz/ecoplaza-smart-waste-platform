import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";
import type { RemoteWasteRecord } from "../services/wasteService";
import type { Container } from "../services/containerService";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface DeleteWasteRecordModalProps {
  records: RemoteWasteRecord[];
  containers: Container[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (recordId: string) => void;
}

export default function DeleteWasteRecordModal({
  records,
  containers,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteWasteRecordModalProps) {
  const { t } = useTranslation();

  // Filtrar estrictamente solo residuos que NO estén vendidos (disponibles o registrados)
  const eligibleRecords = useMemo(
    () => records.filter((r) => r.status === "available" || r.status === "registered"),
    [records],
  );

  const [selectedId, setSelectedId] = useState<string>(
    () => eligibleRecords[0]?.id ?? "",
  );

  const containerMap = useMemo(
    () => new Map(containers.map((c) => [c.id, c.code])),
    [containers],
  );

  const dialogRef = useDialogFocus(onClose, !isDeleting);

  const handleConfirm = () => {
    if (!selectedId || isDeleting) return;
    onConfirm(selectedId);
  };

  const selectedRecord = eligibleRecords.find((r) => r.id === selectedId);

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
        aria-labelledby="delete-waste-title"
        aria-describedby="delete-waste-description"
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
                id="delete-waste-title"
                className="text-lg font-semibold text-ecoplaza-text"
              >
                {t("waste.deleteWasteModalTitle")}
              </h2>
              <p className="text-xs text-ecoplaza-text-muted">
                {t("waste.deleteWasteModalSubtitle")}
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
            id="delete-waste-description"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300"
          >
            <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>{t("waste.deleteWasteIntegrityNotice")}</span>
          </div>

          {eligibleRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-ecoplaza-text-muted">
              {t("waste.noDeletableWasteRecords")}
            </p>
          ) : (
            <div>
              <label
                htmlFor="delete-waste-select"
                className="block text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70"
              >
                {t("waste.selectWasteToDelete")}
              </label>
              <select
                id="delete-waste-select"
                data-testid="delete-waste-select"
                value={selectedId}
                disabled={isDeleting}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eligibleRecords.map((r) => {
                  const recordCode = `RES-${r.recordNumber.padStart(3, "0")}`;
                  const containerCode = containerMap.get(r.containerId) ?? t("waste.unknownContainer");
                  const categoryName = t(`common.${r.category}`);
                  const statusName = t(`common.${r.status}`);
                  return (
                    <option key={r.id} value={r.id}>
                      {`${recordCode} — ${containerCode} — ${categoryName} (${r.weightKg} kg) [${statusName}]`}
                    </option>
                  );
                })}
              </select>

              {selectedRecord && (
                <div className="mt-3 rounded-xl border border-ecoplaza-border/60 bg-ecoplaza-background/60 p-3 text-xs text-ecoplaza-text-muted">
                  <p className="font-medium text-ecoplaza-text">
                    {t("waste.confirmDeleteWastePrompt")}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-ecoplaza-text">RES-{selectedRecord.recordNumber.padStart(3, "0")}</span>
                    {" • "}
                    <span>{containerMap.get(selectedRecord.containerId) ?? t("waste.unknownContainer")}</span>
                    {" • "}
                    <span>{selectedRecord.weightKg} kg</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-ecoplaza-border pt-4">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("waste.cancel")}
          </button>
          <button
            type="button"
            data-testid="confirm-delete-waste-button"
            disabled={isDeleting || !selectedId || eligibleRecords.length === 0}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            )}
            <span>
              {isDeleting
                ? t("waste.deletingWaste")
                : t("waste.deleteWasteConfirm")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
