import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteDistributionChart from "../components/WasteDistributionChart";

const wasteDistribution = [
  {
    label: "Orgánicos",
    value: 540,
    percentage: 43,
  },
  {
    label: "Reciclables",
    value: 430,
    percentage: 34,
  },
  {
    label: "No aprovechables",
    value: 278,
    percentage: 23,
  },
];

function ReportsPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Análisis de datos"
        title="Informes"
        description="Consulta indicadores y análisis sobre la gestión de residuos de EcoPlaza."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Residuos registrados"
          value="1.248 kg"
          description="Acumulado general"
        />

        <MetricCard
          title="Material vendido"
          value="312 kg"
          description="Cantidad comercializada"
        />

        <MetricCard
          title="Ingresos generados"
          value="$2.480.000"
          description="Acumulado por ventas"
        />

        <MetricCard
          title="Eficiencia comercial"
          value="25%"
          description="Material vendido frente al registrado"
        />
      </div>
      <div className="mt-8">
        <WasteDistributionChart data={wasteDistribution} />
      </div>
    </section>
  );
}

export default ReportsPage;
