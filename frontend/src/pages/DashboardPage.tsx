import WasteSummaryCard from "../components/WasteSummaryCard";
import SensorStatusCard from "../components/SensorStatusCard";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
function DashboardPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Resumen general"
        title="Panel de control"
        description="Supervisa el estado general de EcoPlaza y la gestión inteligente de residuos."
      />
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
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Estado de sensores
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Monitoreo actual de los contenedores registrados.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <SensorStatusCard
            name="Contenedor 01"
            category="Residuos orgánicos"
            fillLevel={68}
            status="Activo"
          />

          <SensorStatusCard
            name="Contenedor 02"
            category="Residuos reciclables"
            fillLevel={42}
            status="Activo"
          />

          <SensorStatusCard
            name="Contenedor 03"
            category="Residuos no aprovechables"
            fillLevel={81}
            status="Activo"
          />
        </div>
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Residuos por categoría
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Distribución actual de los residuos registrados en EcoPlaza.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <WasteSummaryCard title="Orgánicos" amount="540 kg" percentage={43} />

          <WasteSummaryCard
            title="Reciclables"
            amount="430 kg"
            percentage={34}
          />

          <WasteSummaryCard
            title="No aprovechables"
            amount="278 kg"
            percentage={23}
          />
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
