import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Radio, RefreshCw } from "lucide-react";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorDeviceCard from "../components/SensorDeviceCard";
import SensorTelemetryHistoryModal from "../components/SensorTelemetryHistoryModal";
import ContainerManagementPanel from "../components/ContainerManagementPanel";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import { listContainers, type Container } from "../services/containerService";
import { getLatestTelemetry, type TelemetryRecord } from "../services/sensorService";

type ContainerTelemetryMap = Map<string, TelemetryRecord | null>;

const AUTO_REFRESH_INTERVAL_MS = 10000;

type SensorsPageProps = {
  initialContainers?: Container[];
  initialAutoRefresh?: boolean;
};

function formatTelemetryTimestamp(
  isoDateStr: string | null | undefined,
  locale: string,
): string {
  if (!isoDateStr) return "—";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "—";
  }
}

function SensorsPage({
  initialContainers,
  initialAutoRefresh = false,
}: SensorsPageProps = {}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showDemoData } = useDemoVisibility();

  const requestRevisionRef = useRef(0);
  const [containers, setContainers] = useState<Container[]>(initialContainers ?? []);
  const [telemetryByContainer, setTelemetryByContainer] = useState<ContainerTelemetryMap>(new Map());
  const [isLoading, setIsLoading] = useState(initialContainers === undefined && Boolean(user));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(initialAutoRefresh);

  const isBusyRef = useRef(isLoading);
  useEffect(() => {
    isBusyRef.current = isLoading;
  }, [isLoading]);

  const fetchTelemetryData = useCallback(
    async (revision: number) => {
      if (!user) {
        setContainers([]);
        setTelemetryByContainer(new Map());
        setIsLoading(false);
        return;
      }

      try {
        let loadedContainers: Container[] = [];
        if (initialContainers !== undefined) {
          loadedContainers = initialContainers;
        } else {
          const result = await listContainers();
          if (revision !== requestRevisionRef.current) return;

          if (!result.ok) {
            setContainers([]);
            setTelemetryByContainer(new Map());
            setLoadError("containers.databaseError");
            setIsLoading(false);
            return;
          }
          loadedContainers = result.data;
        }

        setContainers(loadedContainers);

        // Consulta resiliente y asíncrona de la telemetría más reciente por contenedor
        const telemetryEntries = await Promise.all(
          loadedContainers.map(async (container) => {
            try {
              const telemetry = await getLatestTelemetry(container.id);
              return [container.id, telemetry] as const;
            } catch {
              return [container.id, null] as const;
            }
          }),
        );

        if (revision !== requestRevisionRef.current) return;

        setTelemetryByContainer(new Map(telemetryEntries));
        setLoadError(null);
        setIsLoading(false);
      } catch {
        if (revision === requestRevisionRef.current) {
          setContainers([]);
          setTelemetryByContainer(new Map());
          setLoadError("containers.databaseError");
          setIsLoading(false);
        }
      }
    },
    [user, initialContainers],
  );

  const handleRefresh = useCallback(() => {
    const revision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);
    void fetchTelemetryData(revision);
  }, [fetchTelemetryData]);

  useEffect(() => {
    const revision = ++requestRevisionRef.current;
    void fetchTelemetryData(revision);

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [fetchTelemetryData]);

  // Auto-refresco en vivo controlado con temporizador periódico
  useEffect(() => {
    if (!isAutoRefreshEnabled || !user || historyTarget !== null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!isBusyRef.current) {
        const revision = ++requestRevisionRef.current;
        void fetchTelemetryData(revision);
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAutoRefreshEnabled, user, historyTarget, fetchTelemetryData]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("sensors.eyebrow")}
        title={t("sensors.title")}
        description={t("sensors.description")}
      />

      {showDemoData && (
        <>
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
        </>
      )}

      {user && (
        <div className="mt-10" aria-labelledby="real-telemetry-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="real-telemetry-title"
                  className="text-lg font-semibold text-ecoplaza-text"
                >
                  {t("sensors.realTelemetryTitle")}
                </h2>
                <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">
                  {t("containers.remoteData")}
                </span>
              </div>
              <p className="mt-1 text-sm text-ecoplaza-text-muted">
                {t("sensors.realTelemetryDescription")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {/* Toggle de Auto-refresco en vivo */}
              <button
                type="button"
                role="switch"
                aria-checked={isAutoRefreshEnabled}
                onClick={() => setIsAutoRefreshEnabled((current) => !current)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary ${
                  isAutoRefreshEnabled
                    ? "border-ecoplaza-primary/40 bg-ecoplaza-primary/10 text-ecoplaza-primary"
                    : "border-ecoplaza-border bg-ecoplaza-surface text-ecoplaza-text-muted hover:border-ecoplaza-border/80 hover:text-ecoplaza-text"
                }`}
                aria-label={t("sensors.autoRefreshAriaLabel")}
                title={t("sensors.refreshEvery10s")}
              >
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {isAutoRefreshEnabled && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ecoplaza-primary opacity-75"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full transition-colors ${
                      isAutoRefreshEnabled
                        ? "bg-ecoplaza-primary"
                        : "bg-ecoplaza-border"
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <span>
                  {t(isAutoRefreshEnabled ? "sensors.live" : "sensors.paused")}
                </span>
                <span className="hidden sm:inline text-[11px] font-normal opacity-80">
                  ({t("sensors.autoRefresh")})
                </span>
              </button>

              {/* Botón de recarga manual */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("sensors.refreshTelemetry")}
              >
                <RefreshCw
                  size={15}
                  className={isLoading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {t("sensors.refreshTelemetry")}
                </span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div
              role="status"
              className="mt-4 flex min-h-36 items-center justify-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 text-sm text-ecoplaza-text-muted"
            >
              <LoaderCircle
                className="animate-spin text-ecoplaza-primary"
                size={20}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span>{t("sensors.loadingTelemetry")}</span>
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">
                {t(loadError)}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-background text-ecoplaza-text-muted">
                <Radio size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
                {t("sensors.noContainersTitle")}
              </h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-ecoplaza-text-muted">
                {t("sensors.noContainersDescription")}
              </p>
            </div>
          ) : (
            <div
              className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              data-testid="real-telemetry-grid"
            >
              {containers.map((container) => {
                const telemetry = telemetryByContainer.get(container.id);
                const hasTelemetry = telemetry !== null && telemetry !== undefined;

                return (
                  <SensorDeviceCard
                    key={container.id}
                    name={container.code}
                    sensorId={container.id}
                    hasTelemetry={hasTelemetry}
                    fillLevel={telemetry?.fillLevelPercent ?? null}
                    batteryLevel={telemetry?.batteryLevelPercent ?? null}
                    temperatureCelsius={telemetry?.temperatureCelsius ?? null}
                    status={
                      hasTelemetry
                        ? telemetry.fillLevelPercent > 80
                          ? t("sensors.alertStatus")
                          : t("common.active")
                        : t("sensors.waitingSignal")
                    }
                    lastUpdate={
                      hasTelemetry
                        ? formatTelemetryTimestamp(telemetry.recordedAt, locale)
                        : t("sensors.noTelemetry")
                    }
                    onViewHistory={() =>
                      setHistoryTarget({
                        id: container.id,
                        name: container.code,
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {user && <ContainerManagementPanel key={user.id} />}

      {historyTarget && (
        <SensorTelemetryHistoryModal
          containerId={historyTarget.id}
          containerName={historyTarget.name}
          isOpen={true}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </section>
  );
}

export default SensorsPage;
