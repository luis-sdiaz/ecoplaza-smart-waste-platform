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
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ecoplaza-text">{title}</p>

        <span className="text-xs font-medium text-ecoplaza-primary">
          {percentageLabel ?? `${percentage}%`}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold text-ecoplaza-text">{amount}</p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ecoplaza-background">
        <div
          className="h-full rounded-full bg-ecoplaza-secondary"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </article>
  );
}

export default WasteSummaryCard;
