import { useEffect, useRef } from "react";
import { LoaderCircle, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ResetPreferencesDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  testId?: string;
};

function ResetPreferencesDialog({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
  testId = "reset-preferences-dialog",
}: ResetPreferencesDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    try {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    } catch {
      // jsdom environment fallback
    }
    cancelButtonRef.current?.focus();

    return () => {
      try {
        if (typeof dialog.close === "function") {
          dialog.close();
        }
      } catch {
        // jsdom environment fallback
      }
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      open
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-preferences-title"
      aria-describedby="reset-preferences-description"
      data-testid={testId}
      className="m-auto w-full max-w-md rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-0 text-ecoplaza-text shadow-xl backdrop:bg-black/35 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) {
          onCancel();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          if (!isSubmitting) {
            onCancel();
          }
        }
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-background text-ecoplaza-primary">
            <RotateCcw size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={t("settings.resetClose")}
            className="cursor-pointer rounded-lg p-1.5 text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <h2
          id="reset-preferences-title"
          className="mt-4 text-lg font-semibold text-ecoplaza-text"
        >
          {t("settings.resetDialogTitle")}
        </h2>

        <p
          id="reset-preferences-description"
          className="mt-2 text-sm leading-6 text-ecoplaza-text-muted"
        >
          {t("settings.resetDialogDescription")}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="cursor-pointer rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("settings.resetCancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                <span role="status">{t("settings.resetting")}</span>
              </>
            ) : (
              t("settings.resetConfirm")
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ResetPreferencesDialog;
