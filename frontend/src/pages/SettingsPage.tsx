import PageHeader from "../components/PageHeader";

function SettingsPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Preferencias del sistema"
        title="Configuración"
        description="Administra las preferencias generales y parámetros de EcoPlaza."
      />
    </section>
  );
}

export default SettingsPage;
