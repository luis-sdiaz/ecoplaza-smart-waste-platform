interface SensorDeviceCardProps {
  name: string;
  sensorId: string;
  category: string;
  fillLevel: number;
  weight: number;
  status: string;
  lastUpdate: string;
}

function SensorDeviceCard({
  name,
  sensorId,
  category,
  fillLevel,
  weight,
  status,
  lastUpdate,
}: SensorDeviceCardProps) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ecoplaza-text">{name}</h3>

          <p className="mt-1 text-xs text-ecoplaza-text-muted">{sensorId}</p>
        </div>

        <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
          {status}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-sm text-ecoplaza-text-muted">{category}</p>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ecoplaza-text-muted">{t("sensors.fillLevel")}</span>

          <span className="font-semibold text-ecoplaza-text">{fillLevel}%</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ecoplaza-background">
          <div
            className="h-full rounded-full bg-ecoplaza-primary"
            style={{ width: `${fillLevel}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-ecoplaza-text-muted">{t("sensors.registeredWeight")}</p>

            <p className="mt-1 text-lg font-semibold text-ecoplaza-text">
              {weight} kg
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-ecoplaza-text-muted">{t("sensors.lastReading")}</p>

            <p className="mt-1 text-sm font-medium text-ecoplaza-text">
              {lastUpdate}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default SensorDeviceCard;
import { useTranslation } from "react-i18next";
