interface WasteSummaryCardProps {
  title: string;
  amount: string;
  percentage: number;
  percentageLabel?: string;
}

function WasteSummaryCard({
  title,
  amount,
  percentage,
  percentageLabel,
}: WasteSummaryCardProps) {
  const displayPercentage = percentageLabel ?? `${percentage}%`;

  return (
    <article className="glass-card group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>

        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          {displayPercentage}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{amount}</p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </article>
  );
}

export default WasteSummaryCard;
