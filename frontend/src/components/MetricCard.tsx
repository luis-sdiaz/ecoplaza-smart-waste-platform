interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  badge?: string;
}

function MetricCard({ title, value, description, badge }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ecoplaza-text-muted">{title}</p>
        {badge && (
          <span className="shrink-0 rounded-full bg-ecoplaza-background px-2 py-1 text-[10px] font-semibold text-ecoplaza-text-muted">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold text-ecoplaza-text">{value}</p>

      <p className="mt-2 text-xs text-ecoplaza-text-muted">{description}</p>
    </article>
  );
}

export default MetricCard;
