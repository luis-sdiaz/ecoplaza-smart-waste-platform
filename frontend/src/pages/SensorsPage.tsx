import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, LoaderCircle, Radio, RefreshCw } from "lucide-react";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorDeviceCard from "../components/SensorDeviceCard";
import SensorTelemetryHistoryModal from "../components/SensorTelemetryHistoryModal";
import SimulateTelemetryModal from "../components/SimulateTelemetryModal";
import SuccessToast from "../components/SuccessToast";
import ContainerManagementPanel from "../components/ContainerManagementPanel";
import { useTranslation } from "react-i18next";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import { listContainers, type Container } from "../services/containerService";
import { getLatestTelemetry, type TelemetryRecord } from "../services/sensorService";

type ContainerTelemetryMap = Map<string, TelemetryRecord | null>;

const AUTO_REFRESH_INTERVAL_MS = 10000;

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

  return (
    <section className="p-8 space-y-8">
      <PageHeader
        eyebrow={t("sensors.eyebrow")}
        title={t("sensors.title")}
        description={t("sensors.description")}
      />

      {showDemoData && (
        <section className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t("sensors.demoTitle")}
                </h2>
                <span className="rounded-full border border-amber-300/60 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                  {t("sensors.demoBadge")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("sensors.demoDescription")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="mt-8 border-t border-slate-200/60 dark:border-white/10 pt-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("sensors.demoDevices")}
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("sensors.deviceDescription")}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
      )}

      {user && (
        <section className="glass-panel rounded-2xl p-6 shadow-sm" aria-labelledby="real-telemetry-title">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="real-telemetry-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  {t("sensors.realTelemetryTitle")}
                </h2>
                <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                  {t("containers.remoteData")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("sensors.realTelemetryDescription")}
              </p>
            </div>

            {/* Barra de Controles en micro-isla de cristal esmerilado */}
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
          ) : loadError ? (
            <div
              role="alert"
              className="mt-6 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-rose-200/80 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/10 p-6 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
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
          ) : containers.length === 0 ? (
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
              className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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
                    onManageContainer={handleManageContainer}
                    onSimulateTelemetry={(containerId) => {
                      setSimulateTarget({
                        id: containerId,
                        name: container.code,
                      });
                      setIsSimulateModalOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>
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
