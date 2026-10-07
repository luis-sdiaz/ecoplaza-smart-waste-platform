import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorDeviceCard from "../components/SensorDeviceCard";
import { useTranslation } from "react-i18next";

function SensorsPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("sensors.eyebrow")}
        title={t("sensors.title")}
        description={t("sensors.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("sensors.registered")}
          value="10"
          description={t("sensors.configuredDevices")}
        />

        <MetricCard
          title={t("sensors.active")}
          value="8"
          description={t("sensors.currentlyConnected")}
        />

        <MetricCard
          title={t("sensors.averageLevel")}
          value="64%"
          description={t("sensors.averageFill")}
        />

        <MetricCard
          title={t("sensors.alerts")}
          value="2"
          description={t("sensors.attentionRequired")}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("sensors.devices")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("sensors.deviceDescription")}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <SensorDeviceCard
            name={`${t("waste.container")} 01`}
            sensorId="SEN-001"
            category={t("common.wasteOrganic")}
            fillLevel={68}
            weight={18.4}
            status={t("common.active")}
            lastUpdate={t("sensors.minutesAgo", { count: 2 })}
          />

          <SensorDeviceCard
            name={`${t("waste.container")} 02`}
            sensorId="SEN-002"
            category={t("common.wasteRecyclable")}
            fillLevel={42}
            weight={12.7}
            status={t("common.active")}
            lastUpdate={t("sensors.minutesAgo", { count: 4 })}
          />

          <SensorDeviceCard
            name={`${t("waste.container")} 03`}
            sensorId="SEN-003"
            category={t("common.wasteNonRecyclable")}
            fillLevel={81}
            weight={23.1}
            status={t("common.active")}
            lastUpdate={t("sensors.minutesAgo", { count: 1 })}
          />
        </div>
      </div>
    </section>
  );
}

export default SensorsPage;
