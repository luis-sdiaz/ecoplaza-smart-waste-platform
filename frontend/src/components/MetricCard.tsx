import type { KeyboardEvent, ReactNode } from "react";
import { LoaderCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  subtitle?: string;
  badge?: string;
  badgeText?: string;
  badgeVariant?: "default" | "demo" | "real";
  icon?: ReactNode;
  "data-testid"?: string;
  className?: string;

  // Props de KPIs, accesibilidad e interactividad
  trend?: string | number;
  trendDirection?: "up" | "down" | "neutral";
  trendType?: "up" | "down" | "neutral";
  trendLabel?: string;
  isLoading?: boolean;
  onClick?: () => void;
  role?: string;
  "aria-label"?: string;
}

function MetricCard({
  title,
  value,
  description,
  subtitle,
  badge,
  badgeText,
  badgeVariant,
  icon,
  "data-testid": testId,
  className = "",
  trend,
  trendDirection,
  trendType,
  trendLabel,
  isLoading = false,
  onClick,
  role,
  "aria-label": ariaLabel,
}: MetricCardProps) {
  const { t } = useTranslation();
  const displayDescription = description ?? subtitle ?? "";
  const displayBadge = badgeText ?? badge;
  const isDemo =
    badgeVariant === "demo" ||
    (typeof displayBadge === "string" &&
      displayBadge.toLowerCase().includes("demo"));

  // Inferencia y normalización de la dirección de tendencia
  const effectiveDirection =
    trendDirection ??
    trendType ??
    (typeof trend === "string" && trend.startsWith("-")
      ? "down"
      : typeof trend === "number" && trend < 0
        ? "down"
        : "up");

  const isInteractive = typeof onClick === "function";
  const cardRole = role ?? (isInteractive ? "button" : undefined);
  const cardAriaLabel = ariaLabel ?? (isInteractive ? title : undefined);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isInteractive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

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
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/60 text-emerald-600 shadow-xs backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 dark:border-white/10 dark:bg-white/10 dark:text-emerald-400">
                {icon}
              </div>
            )}
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {title}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {trend !== undefined && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs backdrop-blur-md ${
                    effectiveDirection === "down"
                      ? "border border-rose-300/60 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300"
                      : effectiveDirection === "neutral"
                        ? "border border-slate-300/60 bg-slate-500/10 text-slate-800 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300"
                        : "border border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                  }`}
                >
                  {effectiveDirection === "down" ? (
                    <TrendingDown
                      size={13}
                      className="text-rose-600 dark:text-rose-400"
                      aria-hidden="true"
                    />
                  ) : effectiveDirection === "neutral" ? null : (
                    <TrendingUp
                      size={13}
                      className="text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                  <span>{trend}</span>
                  <span className="sr-only">
                    {effectiveDirection === "down"
                      ? t("common.decrease", "Reducción")
                      : t("common.increase", "Incremento")}
                  </span>
                </span>
                {trendLabel && (
                  <span className="text-xs text-ecoplaza-text-muted">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}

            {displayBadge && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-2xs backdrop-blur-md ${
                  isDemo
                    ? "border border-amber-300/60 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                    : "border border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDemo ? "animate-pulse bg-amber-500" : "bg-emerald-500"
                  }`}
                  aria-hidden="true"
                />
                {displayBadge}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div
            className="flex min-h-[50px] items-center gap-2 py-4 text-ecoplaza-text-muted"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              className="animate-spin text-ecoplaza-primary"
              size={22}
              aria-hidden="true"
            />
            <span className="text-xs font-medium">
              {t("common.loading", "Cargando...")}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        )}
      </div>

      {displayDescription && !isLoading && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {displayDescription}
        </p>
      )}
    </article>
  );
}

export default MetricCard;
