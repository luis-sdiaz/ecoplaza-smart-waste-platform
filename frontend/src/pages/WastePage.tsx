import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteRecordTable from "../components/WasteRecordTable";

const wasteRecords = [
  {
    id: "RES-001",
    category: "Orgánicos",
    weight: "18.4 kg",
    container: "Contenedor 01",
    date: "03/10/2026",
    status: "Disponible",
  },
  {
    id: "RES-002",
    category: "Reciclables",
    weight: "12.7 kg",
    container: "Contenedor 02",
    date: "03/10/2026",
    status: "Disponible",
  },
  {
    id: "RES-003",
    category: "No aprovechables",
    weight: "23.1 kg",
    container: "Contenedor 03",
    date: "02/10/2026",
    status: "Registrado",
  },
  {
    id: "RES-004",
    category: "Orgánicos",
    weight: "15.8 kg",
    container: "Contenedor 01",
    date: "02/10/2026",
    status: "Disponible",
  },
];
function WastePage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Gestión de materiales"
        title="Residuos"
        description="Consulta y administra los residuos registrados en EcoPlaza."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Total registrado"
          value="1.248 kg"
          description="Residuos acumulados"
        />

        <MetricCard
          title="Orgánicos"
          value="540 kg"
          description="43% del total registrado"
        />

        <MetricCard
          title="Reciclables"
          value="430 kg"
          description="34% del total registrado"
        />

        <MetricCard
          title="No aprovechables"
          value="278 kg"
          description="23% del total registrado"
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Registros recientes
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Últimos residuos registrados por los contenedores de EcoPlaza.
          </p>
        </div>

        <div className="mt-4">
          <WasteRecordTable records={wasteRecords} />
        </div>
      </div>
    </section>
  );
}

export default WastePage;
