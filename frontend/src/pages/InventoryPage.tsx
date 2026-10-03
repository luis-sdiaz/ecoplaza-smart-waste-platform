import PageHeader from "../components/PageHeader";

function InventoryPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Material disponible"
        title="Inventario"
        description="Consulta los materiales disponibles para su aprovechamiento y comercialización."
      />
    </section>
  );
}

export default InventoryPage;
