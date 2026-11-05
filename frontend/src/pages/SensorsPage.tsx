import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, LoaderCircle, Radio, RefreshCw } from "lucide-react";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import LiveTelemetryCard from "../components/LiveTelemetryCard";
import SensorDeviceCard from "../components/SensorDeviceCard";
import SensorTelemetryHistoryModal from "../components/SensorTelemetryHistoryModal";
import SimulateTelemetryModal from "../components/SimulateTelemetryModal";
import SuccessToast from "../components/SuccessToast";
import { useTranslation } from "react-i18next";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import { listContainers, type Container } from "../services/containerService";
import { getLatestTelemetry, type TelemetryRecord } from "../services/sensorService";
import type { SensorTelemetry } from "../services/telemetryService";

type ContainerTelemetryMap = Map<string, TelemetryRecord | null>;

const AUTO_REFRESH_INTERVAL_MS = 10000;
const PHYSICAL_CONTAINER_ID = "CTR-BOG-001";
const NETWORK_NODE_FILL_LEVELS = [68, 42, 81] as const;

function isPhysicalContainer(container: Container): boolean {
  return (
    container.id.toUpperCase() === PHYSICAL_CONTAINER_ID ||
    container.code.toUpperCase() === PHYSICAL_CONTAINER_ID
  );
}

type SensorsPageProps = {
  initialContainers?: Container[];
  initialAutoRefresh?: boolean;
  onNavigateToContainers?: (containerId?: string) => void;
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

type SensorsPageViewProps = SensorsPageProps & {
  navigate?: (to: string) => void;
};

function SensorsPageView({
  initialContainers,
  initialAutoRefresh = false,
  onNavigateToContainers,
  navigate,
}: SensorsPageViewProps) {
  const { t, i18n } = useTranslation();

  const handleManageContainer = useCallback(
    (containerId: string) => {
      if (onNavigateToContainers) {
        onNavigateToContainers(containerId);
      } else if (navigate) {
        navigate("/containers");
      }
    },
    [onNavigateToContainers, navigate],
  );

  const { user } = useAuth();
  const { showDemoData } = useDemoVisibility();

  const requestRevisionRef = useRef(0);
  const [containers, setContainers] = useState<Container[]>(initialContainers ?? []);
  const [telemetryByContainer, setTelemetryByContainer] = useState<ContainerTelemetryMap>(new Map());
  const [isLoading, setIsLoading] = useState(initialContainers === undefined && Boolean(user));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(initialAutoRefresh);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulateTarget, setSimulateTarget] = useState<{ id: string; name: string } | null>(null);
  const [simulationNotice, setSimulationNotice] = useState(false);
  const [physicalTelemetry, setPhysicalTelemetry] = useState<SensorTelemetry | null>(null);

  const handlePhysicalTelemetryChange = useCallback((telemetry: SensorTelemetry | null) => {
    setPhysicalTelemetry(telemetry);
  }, []);

  const handleTelemetryRecorded = useCallback((record: TelemetryRecord) => {
    setTelemetryByContainer((prev) => {
      const next = new Map(prev);
      next.set(record.containerId, record);
      return next;
    });
    setSimulationNotice(true);
  }, []);

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
    if (!isAutoRefreshEnabled || !user || historyTarget !== null || isSimulateModalOpen) {
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
  }, [isAutoRefreshEnabled, user, historyTarget, isSimulateModalOpen, fetchTelemetryData]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  const telemetryList = containers
    .map((c) => telemetryByContainer.get(c.id))
    .filter((t): t is TelemetryRecord => t !== null && t !== undefined);
  const telemetryForKpis = physicalTelemetry
    ? telemetryList.filter((telemetry) => {
        const container = containers.find((item) => item.id === telemetry.containerId);
        return !container || !isPhysicalContainer(container);
      })
    : telemetryList;
  const activeContainers = containers.filter((container) =>
    telemetryByContainer.get(container.id),
  );
  const hasPhysicalContainer = containers.some(isPhysicalContainer);
  const hasOnlyPhysicalContainer = containers.length === 1 && hasPhysicalContainer;
  const showNetworkFallback = showDemoData || hasOnlyPhysicalContainer;
  const networkFillLevels = showNetworkFallback
    ? [...NETWORK_NODE_FILL_LEVELS]
    : telemetryForKpis.map((telemetry) => telemetry.fillLevelPercent ?? 0);
  const physicalActiveCount = physicalTelemetry ? 1 : 0;
  const registeredCount = String(
    showNetworkFallback ? NETWORK_NODE_FILL_LEVELS.length + 1 : containers.length + (hasPhysicalContainer ? 0 : 1),
  );
  const activeCountValue = networkFillLevels.length + physicalActiveCount;
  const fillTotal =
    networkFillLevels.reduce((total, fillLevel) => total + fillLevel, 0) +
    (physicalTelemetry?.fillPercentage ?? 0);
  const activeCount = String(activeCountValue);
  const avgFill = activeCountValue > 0 ? `${Math.round(fillTotal / activeCountValue)}%` : "0%";
  const alertCount = String(
    networkFillLevels.filter((fillLevel) => fillLevel > 80).length +
      (physicalTelemetry && physicalTelemetry.fillPercentage >= 70 ? 1 : 0),
  );

  const fallbackNetworkNodes = [
    {
      id: "SEN-001",
      name: `${t("waste.container")} 01`,
      category: t("common.wasteOrganic"),
      fillLevel: NETWORK_NODE_FILL_LEVELS[0],
      weight: 18.4,
      batteryLevel: 92,
      temperatureCelsius: 21.8,
      lastUpdate: t("sensors.minutesAgo", { count: 2 }),
    },
    {
      id: "SEN-002",
      name: `${t("waste.container")} 02`,
      category: t("common.wasteRecyclable"),
      fillLevel: NETWORK_NODE_FILL_LEVELS[1],
      weight: 12.7,
      batteryLevel: 88,
      temperatureCelsius: 22.1,
      lastUpdate: t("sensors.minutesAgo", { count: 4 }),
    },
    {
      id: "SEN-003",
      name: `${t("waste.container")} 03`,
      category: t("common.wasteNonRecyclable"),
      fillLevel: NETWORK_NODE_FILL_LEVELS[2],
      weight: 23.1,
      batteryLevel: 79,
      temperatureCelsius: 23.4,
      lastUpdate: t("sensors.minutesAgo", { count: 1 }),
    },
  ];

  return (
    <section className="p-8 space-y-8">
      <PageHeader
        eyebrow={t("sensors.eyebrow")}
        title={t("sensors.title")}
        description={t("sensors.description")}
        actions={
          user ? (
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 backdrop-blur-md">
              {/* Toggle de Auto-refresco en vivo */}
              <button
                type="button"
                role="switch"
                aria-checked={isAutoRefreshEnabled}
                onClick={() => setIsAutoRefreshEnabled((current) => !current)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  isAutoRefreshEnabled
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
                aria-label={t("sensors.autoRefreshAriaLabel")}
                title={t("sensors.refreshEvery10s")}
              >
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {isAutoRefreshEnabled && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full transition-colors ${
                      isAutoRefreshEnabled
                        ? "bg-emerald-500"
                        : "bg-slate-400 dark:bg-slate-600"
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

              {/* Botón Simular lectura */}
              <button
                type="button"
                onClick={() => {
                  setSimulateTarget(null);
                  setIsSimulateModalOpen(true);
                }}
                disabled={isLoading || containers.length === 0}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("sensors.simulateReading")}
                title={t("sensors.simulateReading")}
              >
                <Activity size={15} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t("sensors.simulateReading")}
                </span>
              </button>

              {/* Botón de recarga manual */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("sensors.refreshTelemetry")}
              >
                <RefreshCw
                  size={15}
                  className={`text-emerald-600 dark:text-emerald-400 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {t("sensors.refreshTelemetry")}
                </span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Hero Component: Telemetría Viva de Hardware Físico (ESP32 + HC-SR04) */}
      {user && (
        <section className="w-full" aria-label={t("sensors.liveTelemetryTitle")}>
          <LiveTelemetryCard
            containerId={PHYSICAL_CONTAINER_ID}
            containerName={
              containers.find(
                (c) => c.code === "CTR-BOG-001" || c.id === "CTR-BOG-001",
              )?.code ?? "CTR-BOG-001"
            }
            onTelemetryChange={handlePhysicalTelemetryChange}
          />
        </section>
      )}

      {/* Fila de 4 KPIs ejecutivos de red */}
      <section aria-label="Métricas ejecutivas de red" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          data-testid="registered-sensors-kpi"
          title={t("sensors.registered")}
          value={registeredCount}
          description={t("sensors.configuredDevices")}
        />

        <MetricCard
          data-testid="active-sensors-kpi"
          title={t("sensors.active")}
          value={activeCount}
          description={t("sensors.currentlyConnected")}
        />

        <MetricCard
          data-testid="average-fill-kpi"
          title={t("sensors.averageLevel")}
          value={avgFill}
          description={t("sensors.averageFill")}
        />

        <MetricCard
          data-testid="sensor-alerts-kpi"
          title={t("sensors.alerts")}
          value={alertCount}
          description={t("sensors.attentionRequired")}
        />
      </section>

      {user && (
        <section className="glass-panel rounded-2xl p-6 shadow-sm" aria-labelledby="active-monitoring-title">
          <div>
            <h2
              id="active-monitoring-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {t("sensors.activeMonitoringTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("sensors.activeMonitoringDescription")}
            </p>
          </div>

          {isLoading ? (
            <div
              role="status"
              className="mt-6 flex min-h-36 items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-6 text-sm text-slate-500 dark:text-slate-400"
            >
              <LoaderCircle
                className="animate-spin text-emerald-600 dark:text-emerald-400"
                size={20}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span>{t("sensors.loadingTelemetry")}</span>
            </div>
          ) : loadError && !showNetworkFallback ? (
            <div
              role="alert"
              className="mt-6 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-red-200/80 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-6 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
                {t(loadError)}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : activeContainers.length === 0 && !showNetworkFallback ? (
            <div className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Radio size={24} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("sensors.noContainersTitle")}
              </h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("sensors.noContainersDescription")}
              </p>
            </div>
          ) : (
            <div
              className="mt-6 grid auto-rows-fr grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3"
              data-testid="real-telemetry-grid"
            >
              {showNetworkFallback
                ? fallbackNetworkNodes.map((node) => (
                  <SensorDeviceCard
                    key={node.id}
                    name={node.name}
                    sensorId={node.id}
                    category={node.category}
                    hasTelemetry={true}
                    fillLevel={node.fillLevel}
                    weight={node.weight}
                    batteryLevel={node.batteryLevel}
                    temperatureCelsius={node.temperatureCelsius}
                    status={node.fillLevel > 80 ? t("sensors.alertStatus") : t("common.active")}
                    lastUpdate={node.lastUpdate}
                    onViewHistory={() => setHistoryTarget({ id: node.id, name: node.name })}
                    onManageContainer={handleManageContainer}
                    className="h-full"
                  />
                ))
                : activeContainers.map((container) => {
                  const telemetry = telemetryByContainer.get(container.id)!;

                  return (
                  <SensorDeviceCard
                    key={container.id}
                    name={container.code}
                    sensorId={container.id}
                    hasTelemetry={true}
                    fillLevel={telemetry.fillLevelPercent}
                    batteryLevel={telemetry.batteryLevelPercent}
                    temperatureCelsius={telemetry.temperatureCelsius}
                    status={
                      telemetry.fillLevelPercent > 80
                        ? t("sensors.alertStatus")
                        : t("common.active")
                    }
                    lastUpdate={formatTelemetryTimestamp(telemetry.recordedAt, locale)}
                    onViewHistory={() =>
                      setHistoryTarget({
                        id: container.id,
                        name: container.code,
                      })
                    }
                    onManageContainer={handleManageContainer}
                    className="h-full"
                  />
                  );
                })}
            </div>
          )}
        </section>
      )}

      {historyTarget && (
        <SensorTelemetryHistoryModal
          containerId={historyTarget.id}
          containerName={historyTarget.name}
          isOpen={true}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {isSimulateModalOpen && (
        <SimulateTelemetryModal
          isOpen={isSimulateModalOpen}
          onClose={() => {
            setIsSimulateModalOpen(false);
            setSimulateTarget(null);
          }}
          containerId={simulateTarget?.id}
          containerName={simulateTarget?.name}
          containers={containers}
          onTelemetryRecorded={handleTelemetryRecorded}
        />
      )}

      {simulationNotice && (
        <SuccessToast
          title={t("sensors.simulateSuccessTitle")}
          description={t("sensors.simulateSuccessDescription")}
          closeLabel={t("sensors.simulateClose")}
          variant="success"
          onClose={() => setSimulationNotice(false)}
        />
      )}
    </section>
  );
}

function SensorsPageRouted(props: SensorsPageProps) {
  const navigate = useNavigate();
  return <SensorsPageView {...props} navigate={navigate} />;
}

export default function SensorsPage(props: SensorsPageProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <SensorsPageRouted {...props} />;
  }
  return <SensorsPageView {...props} />;
}
