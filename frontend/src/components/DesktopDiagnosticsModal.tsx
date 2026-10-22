import { useTranslation } from "react-i18next";
import { Cpu, Globe, HardDrive, Laptop, Maximize2, ShieldCheck, X } from "lucide-react";
import { useDialogFocus } from "../hooks/useDialogFocus";
import {
  getAppPlatformInfo,
  isNativeDialogSupported,
} from "../services/tauriService";

export interface DesktopDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DesktopDiagnosticsModal({
  isOpen,
  onClose,
}: DesktopDiagnosticsModalProps) {
  const { t } = useTranslation();
  const dialogRef = useDialogFocus(onClose, isOpen);
  const platformInfo = getAppPlatformInfo();
  const hasNativeDialogs = isNativeDialogSupported();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-diag-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-2xl"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 border-b border-ecoplaza-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
              <Cpu size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="desktop-diag-title"
                className="text-base font-semibold text-ecoplaza-text"
              >
                {t("desktopDiagnostics.title")}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-border/30 hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            aria-label={t("desktopDiagnostics.close")}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Contenido de Diagnóstico */}
        <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Fila 1: Versión de la plataforma y Modo de Ejecución */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
              <div className="flex items-center gap-1.5 text-ecoplaza-text-muted">
                <ShieldCheck size={14} aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t("settings.appVersionLabel")}
                </span>
              </div>
              <p className="mt-1.5 text-base font-bold text-ecoplaza-text">
                v{platformInfo.version}
              </p>
            </div>

            <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
              <div className="flex items-center gap-1.5 text-ecoplaza-text-muted">
                {platformInfo.isDesktop ? (
                  <Laptop size={14} aria-hidden="true" />
                ) : (
                  <Globe size={14} aria-hidden="true" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t("settings.runtimeModeLabel")}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-ecoplaza-text">
                {platformInfo.isDesktop
                  ? t("settings.runtimeDesktop")
                  : t("settings.runtimeWeb")}
              </p>
            </div>
          </div>

          {/* Fila 2: Gestor de Persistencia / Diálogos */}
          <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
            <div className="flex items-center gap-1.5 text-ecoplaza-text-muted">
              <HardDrive size={14} aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wider">
                {t("settings.nativeDialogsLabel")}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-ecoplaza-text">
              {hasNativeDialogs
                ? t("settings.nativeDialogsSupported")
                : t("settings.nativeDialogsFallback")}
            </p>
          </div>

          {/* Fila 3: Dimensiones de Ventana Segura */}
          <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-3">
            <div className="flex items-center gap-2 text-ecoplaza-text-muted">
              <Maximize2 size={14} aria-hidden="true" />
              <span className="text-xs font-medium text-ecoplaza-text">
                {t("desktopDiagnostics.minDimensions")}
              </span>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="mt-5 flex justify-end border-t border-ecoplaza-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-ecoplaza-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-ecoplaza-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
          >
            {t("desktopDiagnostics.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DesktopDiagnosticsModal;

