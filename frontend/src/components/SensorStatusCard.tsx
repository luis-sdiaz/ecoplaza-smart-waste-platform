interface SensorStatusCardProps {
  name: string;
  category: string;
  fillLevel: number;
  status: string;
}

function SensorStatusCard({
  name,
  category,
  fillLevel,
  status,
}: SensorStatusCardProps) {
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ecoplaza-text">{name}</p>

          <p className="mt-1 text-xs text-ecoplaza-text-muted">{category}</p>
        </div>

        <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
          {status}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ecoplaza-text-muted">Nivel de llenado</span>

          <span className="font-semibold text-ecoplaza-text">{fillLevel}%</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ecoplaza-background">
          <div
            className="h-full rounded-full bg-ecoplaza-primary"
            style={{ width: `${fillLevel}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export default SensorStatusCard;
