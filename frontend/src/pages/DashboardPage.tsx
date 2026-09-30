import MetricCard from "../components/MetricCard";
function DashboardPage() {
  return (
    <section className="p-8">
      <div>
        <p className="text-sm font-medium text-ecoplaza-primary">
          Resumen general
        </p>

        <h1 className="mt-1 text-3xl font-semibold text-ecoplaza-text">
          Panel de control
        </h1>

        <p className="mt-2 text-sm text-ecoplaza-text-muted">
          Supervisa el estado general de EcoPlaza y la gestión inteligente de
          residuos.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Residuos registrados"
          value="1.248 kg"
          description="Total acumulado"
        />

        <MetricCard
          title="Sensores activos"
          value="8"
          description="De 10 sensores registrados"
        />

        <MetricCard
          title="Inventario disponible"
          value="386 kg"
          description="Material disponible para comercialización"
        />

        <MetricCard
          title="Ingresos generados"
          value="$2.480.000"
          description="Valor acumulado por ventas"
        />
      </div>
    </section>
  );
}

export default DashboardPage;
