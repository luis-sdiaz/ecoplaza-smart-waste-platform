import AssistantPanel from "../components/AssistantPanel";
import PageHeader from "../components/PageHeader";

function AssistantPage() {
  return (
    <section className="p-8">
      <PageHeader
        eyebrow="Inteligencia artificial"
        title="Asistente IA"
        description="Analiza información de EcoPlaza y obtén apoyo inteligente para la gestión de residuos."
      />

      <div className="mt-8">
        <AssistantPanel />
      </div>
    </section>
  );
}

export default AssistantPage;
