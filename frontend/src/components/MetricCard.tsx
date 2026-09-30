interface MetricCardProps {
  title: string;
  value: string;
  description: string;
}

function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <p className="text-sm font-medium text-ecoplaza-text-muted">{title}</p>

      <p className="mt-3 text-2xl font-semibold text-ecoplaza-text">{value}</p>

      <p className="mt-2 text-xs text-ecoplaza-text-muted">{description}</p>
    </article>
  );
}

export default MetricCard;
