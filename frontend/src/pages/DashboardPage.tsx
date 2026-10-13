import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SensorStatusCard from "../components/SensorStatusCard";
import WasteSummaryCard from "../components/WasteSummaryCard";
import {
  getWasteStatistics,
  type WasteErrorCode,
  type WasteStatistics,
} from "../services/wasteService";

const EMPTY_STATISTICS: WasteStatistics = {
  recordCount: 0,
  totalWeightKg: 0,
  organicWeightKg: 0,
  recyclableWeightKg: 0,
  nonRecyclableWeightKg: 0,
  organicPercentage: 0,
  recyclablePercentage: 0,
  nonRecyclablePercentage: 0,
};

type StatisticsResult = Awaited<ReturnType<typeof getWasteStatistics>>;

function getStatisticsErrorKey(code: WasteErrorCode): string {
  if (code === "unauthorized") return "dashboard.unauthorized";
  if (code === "network_error") return "dashboard.networkError";
  if (code === "permission_denied") return "dashboard.permissionError";
  return "dashboard.statisticsError";
}

function UserDashboardPage() {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const [statistics, setStatistics] = useState<WasteStatistics>(EMPTY_STATISTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyStatisticsResult = useCallback((
    result: StatisticsResult,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setStatistics(EMPTY_STATISTICS);
      setLoadError(getStatisticsErrorKey(result.error.code));
      setIsLoading(false);
      return;
    }

    setStatistics(result.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadStatistics = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    const result = await getWasteStatistics();
    applyStatisticsResult(result, requestRevision);
  }, [applyStatisticsResult]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void getWasteStatistics().then((result) => {
      applyStatisticsResult(result, requestRevision);
    });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyStatisticsResult]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(weightKg)} ${t("common.kg")}`;
  const formatPercentage = (percentage: number): string =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(percentage / 100);
  const realValueUnavailable = isLoading || loadError !== null;
  const demoBadge = t("dashboard.demoData");

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {isLoading && (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted">
          <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} strokeWidth={1.8} aria-hidden="true" />
          {t("dashboard.loadingStatistics")}
        </div>
      )}

      {!isLoading && loadError && (
        <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-ecoplaza-danger/30 bg-ecoplaza-danger/10 px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-ecoplaza-danger">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(loadError)}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadStatistics()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 text-sm font-medium text-ecoplaza-danger"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("dashboard.retry")}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("dashboard.registeredWaste")}
          value={realValueUnavailable ? "—" : formatWeight(statistics.totalWeightKg)}
          description={t("dashboard.realWasteDescription")}
          badge={t("dashboard.realData")}
        />
        <MetricCard
          title={t("dashboard.activeSensors")}
          value="8"
          description={t("dashboard.registeredSensors", { count: 10 })}
          badge={demoBadge}
        />
        <MetricCard
          title={t("dashboard.availableInventory")}
          value="386 kg"
          description={t("dashboard.materialForSale")}
          badge={demoBadge}
        />
        <MetricCard
          title={t("dashboard.revenue")}
          value="$2.480.000"
          description={t("dashboard.accumulatedSales")}
          badge={demoBadge}
        />
      </div>

      <div className="mt-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.sensorStatus")}</h2>
            <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">{demoBadge}</span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.sensorMonitoringDemo")}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <SensorStatusCard name={`${t("waste.container")} 01`} category={t("common.wasteOrganic")} fillLevel={68} status={t("common.active")} />
          <SensorStatusCard name={`${t("waste.container")} 02`} category={t("common.wasteRecyclable")} fillLevel={42} status={t("common.active")} />
          <SensorStatusCard name={`${t("waste.container")} 03`} category={t("common.wasteNonRecyclable")} fillLevel={81} status={t("common.active")} />
        </div>
      </div>

      <div className="mt-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.wasteByCategory")}</h2>
            <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{t("dashboard.realData")}</span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.realWasteDistribution")}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <WasteSummaryCard
            title={t("common.organic")}
            amount={realValueUnavailable ? "—" : formatWeight(statistics.organicWeightKg)}
            percentage={realValueUnavailable ? 0 : statistics.organicPercentage}
            percentageLabel={realValueUnavailable ? "—" : formatPercentage(statistics.organicPercentage)}
          />
          <WasteSummaryCard
            title={t("common.recyclable")}
            amount={realValueUnavailable ? "—" : formatWeight(statistics.recyclableWeightKg)}
            percentage={realValueUnavailable ? 0 : statistics.recyclablePercentage}
            percentageLabel={realValueUnavailable ? "—" : formatPercentage(statistics.recyclablePercentage)}
          />
          <WasteSummaryCard
            title={t("common.nonRecyclable")}
            amount={realValueUnavailable ? "—" : formatWeight(statistics.nonRecyclableWeightKg)}
            percentage={realValueUnavailable ? 0 : statistics.nonRecyclablePercentage}
            percentageLabel={realValueUnavailable ? "—" : formatPercentage(statistics.nonRecyclablePercentage)}
          />
        </div>
      </div>
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return user ? <UserDashboardPage key={user.id} /> : null;
}

export default DashboardPage;
