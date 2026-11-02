import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import ContainerManagementPanel from "../components/ContainerManagementPanel";
import type { Container } from "../services/containerService";

export type ContainersPageProps = {
  initialContainers?: Container[];
};

export function ContainersPage({ initialContainers }: ContainersPageProps = {}) {
  const { t } = useTranslation();

  return (
    <section className="p-8">
      <PageHeader
        title={t("containers.title")}
        description={t("containers.description")}
      />

      <div className="mt-8">
        <ContainerManagementPanel initialContainers={initialContainers} />
      </div>
    </section>
  );
}

export default ContainersPage;
