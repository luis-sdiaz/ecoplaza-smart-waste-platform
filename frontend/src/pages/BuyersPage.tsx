import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import BuyerTable from "../components/BuyerTable";

const buyers = [
  {
    id: "BUY-001",
    name: "Reciclar del Sur",
    type: "Empresa recicladora",
    interest: "Reciclables",
    contact: "contacto@reciclardelsur.co",
    status: "Activo",
  },
  {
    id: "BUY-002",
    name: "BioCompost Nariño",
    type: "Productor de compost",
    interest: "Orgánicos",
    contact: "ventas@biocompost.co",
    status: "Activo",
  },
  {
    id: "BUY-003",
    name: "EcoMercado Local",
    type: "Comerciante",
    interest: "Reciclables",
    contact: "compras@ecomercado.co",
    status: "Interesado",
  },
  {
    id: "BUY-004",
    name: "Asociación Verde",
    type: "Asociación",
    interest: "Orgánicos",
    contact: "gestion@asociacionverde.co",
    status: "Activo",
  },
];
function BuyersPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Red comercial"
        title="Compradores"
        description="Gestiona los compradores interesados en los materiales disponibles de EcoPlaza."
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title="Compradores registrados"
          value="4"
          description="Contactos comerciales registrados"
        />

        <MetricCard
          title="Compradores activos"
          value="3"
          description="Con actividad reciente"
        />

        <MetricCard
          title="Interesados en reciclables"
          value="2"
          description="Compradores registrados"
        />

        <MetricCard
          title="Interesados en orgánicos"
          value="2"
          description="Compradores registrados"
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            Compradores registrados
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            Contactos interesados en los materiales disponibles de EcoPlaza.
          </p>
        </div>

        <div className="mt-4">
          <BuyerTable buyers={buyers} />
        </div>
      </div>
    </section>
  );
}

export default BuyersPage;
