import { useTranslation } from "react-i18next";
import { Cpu, Globe, HardDrive, Laptop, ShieldCheck } from "lucide-react";
import {
  getAppPlatformInfo,
  isNativeDialogSupported,
} from "../services/tauriService";

export interface SystemInfoCardProps {
  className?: string;
}

function SystemInfoCard({ className = "" }: SystemInfoCardProps) {
  const { t } = useTranslation();
  const platformInfo = getAppPlatformInfo();
  const hasNativeDialogs = isNativeDialogSupported();

  return (
    <section
      role="region"
      aria-labelledby="system-info-heading"
      className={`rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-xs ${className}`}
    >
      <div className="flex flex-col gap-4 border-b border-ecoplaza-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
            <Cpu size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="system-info-heading"
              className="text-base font-semibold text-ecoplaza-text"
            >
              {t("settings.systemInfoTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-ecoplaza-text-muted">
              {t("settings.systemInfoDescription")}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            platformInfo.isDesktop
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
          }`}
        >
          {platformInfo.isDesktop ? (
            <Laptop size={14} aria-hidden="true" />
          ) : (
            <Globe size={14} aria-hidden="true" />
          )}
          <span>
            {platformInfo.isDesktop
              ? t("settings.runtimeDesktop")
              : t("settings.runtimeWeb")}
          </span>
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Versión de la plataforma */}
        <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-4">
          <div className="flex items-center gap-2 text-ecoplaza-text-muted">
            <ShieldCheck size={16} aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("settings.appVersionLabel")}
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-ecoplaza-text">
            v{platformInfo.version}
          </p>
        </div>

        {/* Modo de ejecución */}
        <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-4">
          <div className="flex items-center gap-2 text-ecoplaza-text-muted">
            {platformInfo.isDesktop ? (
              <Laptop size={16} aria-hidden="true" />
            ) : (
              <Globe size={16} aria-hidden="true" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("settings.runtimeModeLabel")}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ecoplaza-text">
            {platformInfo.isDesktop
              ? t("settings.runtimeDesktop")
              : t("settings.runtimeWeb")}
          </p>
        </div>

        {/* Gestor de archivos / Diálogos nativos */}
        <div className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-4">
          <div className="flex items-center gap-2 text-ecoplaza-text-muted">
            <HardDrive size={16} aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("settings.nativeDialogsLabel")}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ecoplaza-text">
            {hasNativeDialogs
              ? t("settings.nativeDialogsSupported")
              : t("settings.nativeDialogsFallback")}
          </p>
        </div>
      </div>
    </section>
  );
}

export default SystemInfoCard;

