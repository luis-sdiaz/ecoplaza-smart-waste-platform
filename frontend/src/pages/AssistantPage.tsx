import AssistantPanel from "../components/AssistantPanel";
import PageHeader from "../components/PageHeader";
import { useTranslation } from "react-i18next";

function AssistantPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("assistant.eyebrow")}
        title={t("assistant.title")}
        description={t("assistant.description")}
      />

      <div className="mt-8">
        <AssistantPanel />
      </div>
    </section>
  );
}

export default AssistantPage;
