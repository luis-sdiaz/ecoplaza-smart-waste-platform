import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import InventoryTable from "../components/InventoryTable";

const inventoryItems = [
  {
    id: "LOT-001",
    category: "Orgánicos",
    quantity: 120,
    unitPrice: 1800,
    status: "Disponible",
  },
  {
    id: "LOT-002",
    category: "Reciclables",
    quantity: 98,
    unitPrice: 2500,
    status: "Disponible",
  },
  {
    id: "LOT-003",
    category: "Orgánicos",
    quantity: 76,
    unitPrice: 900,
    status: "Disponible",
  },
  {
    id: "LOT-004",
    category: "Reciclables",
    quantity: 92,
    unitPrice: 2200,
    status: "Reservado",
  },
];

function InventoryPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Material disponible"
        title="Inventario"
        description="Consulta los materiales disponibles para su aprovechamiento y comercialización."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Material en inventario"
          value="386 kg"
          description="Disponible y reservado"
        />

        <MetricCard
          title="Lotes registrados"
          value="4"
          description="Registros activos en inventario"
        />

        <MetricCard
          title="Categorías"
          value="2"
          description="Categorías disponibles en inventario"
        />

        <MetricCard
          title="Valor estimado"
          value="$731.800"
          description="Estimación del inventario actual"
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Lotes en inventario
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Material registrado y preparado para su comercialización.
          </p>
        </div>

        <div className="mt-4">
          <InventoryTable items={inventoryItems} />
        </div>
      </div>
    </section>
  );
}

export default InventoryPage;
