import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SalesTable from "../components/SalesTable";

const sales = [
  {
    id: "SAL-001",
    buyer: "Reciclar del Sur",
    material: "Reciclables",
    quantity: 80,
    total: 640000,
    date: "03/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-002",
    buyer: "BioCompost Nariño",
    material: "Orgánicos",
    quantity: 72,
    total: 540000,
    date: "02/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-003",
    buyer: "EcoMercado Local",
    material: "Reciclables",
    quantity: 90,
    total: 780000,
    date: "01/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-004",
    buyer: "Reciclar del Sur",
    material: "Reciclables",
    quantity: 70,
    total: 520000,
    date: "30/09/2026",
    status: "Completada",
  },
];
function SalesPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Comercialización"
        title="Ventas"
        description="Registra y consulta las ventas de materiales gestionadas en EcoPlaza."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Ventas realizadas"
          value="4"
          description="Operaciones registradas"
        />

        <MetricCard
          title="Ingresos generados"
          value="$2.480.000"
          description="Valor acumulado por ventas"
        />

        <MetricCard
          title="Material vendido"
          value="312 kg"
          description="Cantidad comercializada"
        />

        <MetricCard
          title="Compradores atendidos"
          value="3"
          description="Compradores con ventas registradas"
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Ventas registradas
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Historial reciente de comercialización de materiales en EcoPlaza.
          </p>
        </div>

        <div className="mt-4">
          <SalesTable sales={sales} />
        </div>
      </div>
    </section>
  );
}

export default SalesPage;
