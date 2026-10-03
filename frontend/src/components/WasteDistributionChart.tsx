interface WasteDistributionItem {
  label: string;
  value: number;
  percentage: number;
}

interface WasteDistributionChartProps {
  data: WasteDistributionItem[];
}

function WasteDistributionChart({ data }: WasteDistributionChartProps) {
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-ecoplaza-text">
          Distribución de residuos
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          Participación de cada categoría sobre el total registrado.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ecoplaza-text">
                  {item.label}
                </p>

                <p className="mt-1 text-xs text-ecoplaza-text-muted">
                  {item.value} kg
                </p>
              </div>

              <span className="text-sm font-semibold text-ecoplaza-primary">
                {item.percentage}%
              </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-ecoplaza-background">
              <div
                className="h-full rounded-full bg-ecoplaza-secondary"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default WasteDistributionChart;
