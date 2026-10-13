import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorDeviceCard from "../components/SensorDeviceCard";
import ContainerManagementPanel from "../components/ContainerManagementPanel";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

function SensorsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("sensors.eyebrow")}
        title={t("sensors.title")}
        description={t("sensors.description")}
      />

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">
              {t("sensors.demoTitle")}
            </h2>
            <span className="rounded-full bg-ecoplaza-warning/12 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-warning">
              {t("sensors.demoBadge")}
            </span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("sensors.demoDescription")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4">
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
            {t("sensors.demoDevices")}
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

      {user && <ContainerManagementPanel key={user.id} />}
    </section>
  );
}

export default SensorsPage;
