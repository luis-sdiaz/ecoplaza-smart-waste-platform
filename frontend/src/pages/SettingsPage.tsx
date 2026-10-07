import PageHeader from "../components/PageHeader";
import SettingsPanel from "../components/SettingsPanel";
import { useTranslation } from "react-i18next";

function SettingsPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="mt-8">
        <SettingsPanel />
      </div>
    </section>
  );
}

export default SettingsPage;
