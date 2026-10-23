import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  subtitle?: string;
  badge?: string;
  badgeText?: string;
  badgeVariant?: "default" | "demo" | "real";
  icon?: ReactNode;
  "data-testid"?: string;
  className?: string;
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
}: MetricCardProps) {
  const displayDescription = description ?? subtitle ?? "";
  const displayBadge = badgeText ?? badge;
  const isDemo =
    badgeVariant === "demo" ||
    (typeof displayBadge === "string" &&
      displayBadge.toLowerCase().includes("demo"));

  return (
    <article
      data-testid={testId}
      className={`glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 ${className}`}
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

        <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>

      {displayDescription && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {displayDescription}
        </p>
      )}
    </article>
  );
}

export default MetricCard;
