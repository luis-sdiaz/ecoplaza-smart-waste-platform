import type { KeyboardEvent } from "react";
import { Droplets, Leaf, LoaderCircle, Trees, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface EnvironmentalImpactCardProps {
  title?: string;
  subtitle?: string;
  co2SavedKg?: number | null;
  treesPreserved?: number | null;
  waterSavedLiters?: number | null;
  energySavedKwh?: number | null;
  recyclingRatePercentage?: number | null;
  totalRecycledKg?: number | null;
  badge?: string;
  badgeVariant?: "real" | "demo";
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

export function EnvironmentalImpactCard({
  title,
  subtitle,
  co2SavedKg,
  treesPreserved,
  waterSavedLiters,
  energySavedKwh,
  recyclingRatePercentage,
  totalRecycledKg,
  badge,
  badgeVariant = "real",
  isLoading = false,
  onClick,
  className = "",
  role,
  ariaLabel,
  testId = "environmental-impact-card",
}: EnvironmentalImpactCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const integerFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  // Normalización y cálculo resiliente de factores ecológicos
  const baseRecycledKg =
    typeof totalRecycledKg === "number" && !Number.isNaN(totalRecycledKg)
      ? Math.max(0, totalRecycledKg)
      : null;

  const effectiveCo2 =
    typeof co2SavedKg === "number" && !Number.isNaN(co2SavedKg)
      ? Math.max(0, co2SavedKg)
      : baseRecycledKg !== null
        ? Number((baseRecycledKg * 1.8).toFixed(1))
        : 0;

  const effectiveTrees =
    typeof treesPreserved === "number" && !Number.isNaN(treesPreserved)
      ? Math.max(0, treesPreserved)
      : baseRecycledKg !== null
        ? Number((baseRecycledKg * 0.02).toFixed(1))
        : 0;

  const effectiveWater =
    typeof waterSavedLiters === "number" && !Number.isNaN(waterSavedLiters)
      ? Math.max(0, waterSavedLiters)
      : baseRecycledKg !== null
        ? Number((baseRecycledKg * 25).toFixed(0))
        : 0;

  const effectiveEnergy =
    typeof energySavedKwh === "number" && !Number.isNaN(energySavedKwh)
      ? Math.max(0, energySavedKwh)
      : baseRecycledKg !== null
        ? Number((baseRecycledKg * 2.2).toFixed(1))
        : 0;

  const effectiveRate =
    typeof recyclingRatePercentage === "number" && !Number.isNaN(recyclingRatePercentage)
      ? Math.min(100, Math.max(0, recyclingRatePercentage))
      : null;

  const displayTitle = title ?? t("environmentalImpact.title");
  const displaySubtitle = subtitle ?? t("environmentalImpact.description");
  const displayBadge = badge ?? t("environmentalImpact.realBadge");

  const isInteractive = typeof onClick === "function";
  const cardRole = role ?? (isInteractive ? "button" : "region");
  const cardAriaLabel = ariaLabel ?? displayTitle;

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const formattedCo2 = numberFormatter.format(effectiveCo2);
  const formattedTrees = numberFormatter.format(effectiveTrees);
  const formattedWater = integerFormatter.format(effectiveWater);
  const formattedEnergy = numberFormatter.format(effectiveEnergy);

  return (
    <article
      data-testid={testId}
      role={cardRole}
      aria-label={cardAriaLabel}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-200 ${
        isInteractive
          ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ecoplaza-primary focus-visible:outline-offset-2"
          : ""
      } ${className}`}
    >
      {/* Encabezado y Badges */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{displayTitle}</h2>
          </div>
          {displaySubtitle && (
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{displaySubtitle}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-2xs backdrop-blur-md ${
            badgeVariant === "demo"
              ? "border-amber-300/60 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
              : "border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              badgeVariant === "demo" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
          {displayBadge}
        </span>
      </div>

      {/* Estado de carga */}
      {isLoading ? (
        <div
          role="status"
          className="mt-6 flex min-h-32 flex-col items-center justify-center gap-2 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span>{t("environmentalImpact.loading")}</span>
        </div>
      ) : (
        <>
          {/* Grilla de Métricas de Equivalencia Ecológica */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Emisiones de CO2 evitadas */}
            <div className="glass-card flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("environmentalImpact.co2Saved")}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Leaf size={18} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                  {formattedCo2}{" "}
                  <span className="text-xs font-normal text-ecoplaza-text-muted">
                    {t("environmentalImpact.co2Unit")}
                  </span>
                </p>
                <span className="sr-only">
                  {t("environmentalImpact.accessibleCo2", { value: formattedCo2 })}
                </span>
              </div>
            </div>

            {/* 2. Árboles salvados */}
            <div className="glass-card flex flex-col justify-between rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("environmentalImpact.treesPreserved")}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Trees size={18} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                  {formattedTrees}{" "}
                  <span className="text-xs font-normal text-ecoplaza-text-muted">
                    {t("environmentalImpact.treesUnit")}
                  </span>
                </p>
                <span className="sr-only">
                  {t("environmentalImpact.accessibleTrees", { value: formattedTrees })}
                </span>
              </div>
            </div>

            {/* 3. Agua preservada */}
            <div className="glass-card flex flex-col justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("environmentalImpact.waterSaved")}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Droplets size={18} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                  {formattedWater}{" "}
                  <span className="text-xs font-normal text-ecoplaza-text-muted">
                    {t("environmentalImpact.waterUnit")}
                  </span>
                </p>
                <span className="sr-only">
                  {t("environmentalImpact.accessibleWater", { value: formattedWater })}
                </span>
              </div>
            </div>

            {/* 4. Energía conservada */}
            <div className="glass-card flex flex-col justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ecoplaza-text-muted">
                  {t("environmentalImpact.energySaved")}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Zap size={18} aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-ecoplaza-text">
                  {formattedEnergy}{" "}
                  <span className="text-xs font-normal text-ecoplaza-text-muted">
                    {t("environmentalImpact.energyUnit")}
                  </span>
                </p>
                <span className="sr-only">
                  {t("environmentalImpact.accessibleEnergy", { value: formattedEnergy })}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progreso de tasa de aprovechamiento (opcional) */}
          {effectiveRate !== null && (
            <div className="mt-5 rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ecoplaza-text">
                  {t("environmentalImpact.recyclingRate")}
                </span>
                <span className="font-semibold text-ecoplaza-primary">
                  {numberFormatter.format(effectiveRate)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={effectiveRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("environmentalImpact.recyclingRate")}
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${effectiveRate}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default EnvironmentalImpactCard;

