import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteRecordTable from "../components/WasteRecordTable";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("waste.eyebrow")}
        title={t("waste.title")}
        description={t("waste.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("waste.totalRegistered")}
          value="1.248 kg"
          description={t("waste.accumulatedWaste")}
        />

        <MetricCard
          title={t("common.organic")}
          value="540 kg"
          description={t("waste.percentageOfTotal", { percentage: 43 })}
        />

        <MetricCard
          title={t("common.recyclable")}
          value="430 kg"
          description={t("waste.percentageOfTotal", { percentage: 34 })}
        />

        <MetricCard
          title={t("common.nonRecyclable")}
          value="278 kg"
          description={t("waste.percentageOfTotal", { percentage: 23 })}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("waste.recentRecords")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("waste.recentDescription")}
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
