import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteDistributionChart from "../components/WasteDistributionChart";
import { useTranslation } from "react-i18next";

const wasteDistribution = [
  {
    label: "Orgánicos",
    value: 540,
    percentage: 43,
  },
  {
    label: "Reciclables",
    value: 430,
    percentage: 34,
  },
  {
    label: "No aprovechables",
    value: 278,
    percentage: 23,
  },
];

function ReportsPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("dashboard.registeredWaste")}
          value="1.248 kg"
          description={t("reports.generalAccumulated")}
        />

        <MetricCard
          title={t("sales.soldMaterial")}
          value="312 kg"
          description={t("sales.quantitySold")}
        />

        <MetricCard
          title={t("dashboard.revenue")}
          value="$2.480.000"
          description={t("dashboard.accumulatedSales")}
        />

        <MetricCard
          title={t("reports.commercialEfficiency")}
          value="25%"
          description={t("reports.soldCompared")}
        />
      </div>
      <div className="mt-8">
        <WasteDistributionChart data={wasteDistribution} />
      </div>
    </section>
  );
}

export default ReportsPage;
