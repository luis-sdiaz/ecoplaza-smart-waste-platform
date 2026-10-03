import PageHeader from "../components/PageHeader";
import SettingsPanel from "../components/SettingsPanel";

function SettingsPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Preferencias del sistema"
        title="Configuración"
        description="Administra las preferencias generales y parámetros de EcoPlaza."
      />

      <div className="mt-8">
        <SettingsPanel />
      </div>
    </section>
  );
}

export default SettingsPage;
