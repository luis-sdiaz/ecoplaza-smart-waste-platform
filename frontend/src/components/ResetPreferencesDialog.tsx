import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type ResetPreferencesDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ResetPreferencesDialog({
  isOpen,
  onCancel,
  onConfirm,
}: ResetPreferencesDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    dialog.showModal();
    cancelButtonRef.current?.focus();

    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-preferences-title"
      aria-describedby="reset-preferences-description"
      className="m-auto w-full max-w-md rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-0 text-ecoplaza-text shadow-xl backdrop:bg-black/35 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-background text-ecoplaza-primary">
          <RotateCcw size={20} strokeWidth={2} aria-hidden="true" />
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
            className="cursor-pointer rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
          >
            {t("settings.resetCancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
          >
            {t("settings.resetConfirm")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ResetPreferencesDialog;
