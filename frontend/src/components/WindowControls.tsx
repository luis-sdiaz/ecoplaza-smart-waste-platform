import { useTranslation } from "react-i18next";
import { Minus, Square, X } from "lucide-react";
import {
  closeAppWindow,
  isTauriEnvironment,
  minimizeAppWindow,
  toggleMaximizeAppWindow,
} from "../services/tauriService";

export interface WindowControlsProps {
  className?: string;
}

function WindowControls({ className = "" }: WindowControlsProps) {
  const { t } = useTranslation();

  if (!isTauriEnvironment()) {
    return null;
  }

  const handleMinimize = async () => {
    await minimizeAppWindow();
  };

  const handleToggleMaximize = async () => {
    await toggleMaximizeAppWindow();
  };

  const handleClose = async () => {
    await closeAppWindow();
  };

  return (
    <div
      role="toolbar"
      aria-label={t("windowControls.toolbarLabel")}
      className={`flex items-center gap-1 select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleMinimize}
        aria-label={t("windowControls.minimize")}
        title={t("windowControls.minimize")}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ecoplaza-primary"
      >
        <Minus size={14} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleToggleMaximize}
        aria-label={t("windowControls.maximize")}
        title={t("windowControls.maximize")}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ecoplaza-primary"
      >
        <Square size={13} strokeWidth={2} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleClose}
        aria-label={t("windowControls.close")}
        title={t("windowControls.close")}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500"
      >
        <X size={15} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

export default WindowControls;

