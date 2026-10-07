import WasteSummaryCard from "../components/WasteSummaryCard";
import SensorStatusCard from "../components/SensorStatusCard";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import { useTranslation } from "react-i18next";
function DashboardPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />
      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("dashboard.registeredWaste")}
          value="1.248 kg"
          description={t("dashboard.totalAccumulated")}
        />

        <MetricCard
          title={t("dashboard.activeSensors")}
          value="8"
          description={t("dashboard.registeredSensors", { count: 10 })}
        />

        <MetricCard
          title={t("dashboard.availableInventory")}
          value="386 kg"
          description={t("dashboard.materialForSale")}
        />

        <MetricCard
          title={t("dashboard.revenue")}
          value="$2.480.000"
          description={t("dashboard.accumulatedSales")}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("dashboard.sensorStatus")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("dashboard.sensorMonitoring")}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <SensorStatusCard
            name={`${t("waste.container")} 01`}
            category={t("common.wasteOrganic")}
            fillLevel={68}
            status={t("common.active")}
          />

          <SensorStatusCard
            name={`${t("waste.container")} 02`}
            category={t("common.wasteRecyclable")}
            fillLevel={42}
            status={t("common.active")}
          />

          <SensorStatusCard
            name={`${t("waste.container")} 03`}
            category={t("common.wasteNonRecyclable")}
            fillLevel={81}
            status={t("common.active")}
          />
        </div>
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("dashboard.wasteByCategory")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("dashboard.wasteDistribution")}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <WasteSummaryCard title={t("common.organic")} amount="540 kg" percentage={43} />

          <WasteSummaryCard
            title={t("common.recyclable")}
            amount="430 kg"
            percentage={34}
          />

          <WasteSummaryCard
            title={t("common.nonRecyclable")}
            amount="278 kg"
            percentage={23}
          />
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
