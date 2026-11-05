import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Boxes,
  Clock,
  Info,
  LoaderCircle,
  Radio,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import SensorStatusCard from "../components/SensorStatusCard";
import {
  getReportStatistics,
  type ReportErrorCode,
  type ReportStatistics,
} from "../services/reportService";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import { listSales, type SaleHistoryItem } from "../services/salesService";
import { sortSalesHistory } from "../services/coreWorkflow";
import { listAvailableWasteRecords } from "../services/wasteService";
import { listContainers } from "../services/containerService";
import {
  selectOldestAvailableInventory,
  type AgingInventoryItem,
} from "../services/dashboardAgingInventory";
import { findTopRevenueCategory } from "../services/dashboardRevenueCategory";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import {
  fetchLatestTelemetryByContainer,
  type SensorTelemetry,
} from "../services/telemetryService";

type StatisticsResult = Awaited<ReturnType<typeof getReportStatistics>>;
type AvailableWasteResult = Awaited<ReturnType<typeof listAvailableWasteRecords>>;
type ContainersResult = Awaited<ReturnType<typeof listContainers>>;

function getStatisticsErrorKey(code: ReportErrorCode): string {
  if (code === "unauthorized") return "dashboard.unauthorized";
  if (code === "network_error") return "dashboard.networkError";
  if (code === "permission_denied") return "dashboard.permissionError";
  return "dashboard.statisticsError";
}

function UserDashboardPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const { showDemoData } = useDemoVisibility();
  const requestRevisionRef = useRef(0);
  const salesRevisionRef = useRef(0);
  const inventoryRevisionRef = useRef(0);
  const telemetryRevisionRef = useRef(0);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<SaleHistoryItem[]>([]);
  const [areRecentSalesLoading, setAreRecentSalesLoading] = useState(true);
  const [recentSalesError, setRecentSalesError] = useState(false);
  const [oldestInventory, setOldestInventory] = useState<AgingInventoryItem[]>([]);
  const [isOldestInventoryLoading, setIsOldestInventoryLoading] = useState(true);
  const [oldestInventoryError, setOldestInventoryError] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState<SensorTelemetry | null>(null);

  const applyStatisticsResult = useCallback((
    result: StatisticsResult,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setStatistics(null);
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

    try {
      const result = await getReportStatistics();
      applyStatisticsResult(result, requestRevision);
    } catch {
      if (requestRevision !== requestRevisionRef.current) return;
      setStatistics(null);
      setLoadError("dashboard.statisticsError");
      setIsLoading(false);
    }
  }, [applyStatisticsResult]);

  const loadRecentSales = useCallback(async (): Promise<void> => {
    const requestRevision = ++salesRevisionRef.current;
    setAreRecentSalesLoading(true);
    setRecentSalesError(false);

    try {
      const result = await listSales();
      if (requestRevision !== salesRevisionRef.current) return;
      if (!result.ok) {
        setRecentSales([]);
        setRecentSalesError(true);
      } else {
        setRecentSales(sortSalesHistory(result.data, "newest").slice(0, 5));
      }
    } catch {
      if (requestRevision !== salesRevisionRef.current) return;
      setRecentSales([]);
      setRecentSalesError(true);
    } finally {
      if (requestRevision === salesRevisionRef.current) setAreRecentSalesLoading(false);
    }
  }, []);

  const applyOldestInventoryResults = useCallback((
    wasteResult: AvailableWasteResult,
    containersResult: ContainersResult,
    requestRevision: number,
  ): void => {
    if (requestRevision !== inventoryRevisionRef.current) return;
    if (!wasteResult.ok || !containersResult.ok) {
      setOldestInventory([]);
      setOldestInventoryError(true);
    } else {
      setOldestInventory(selectOldestAvailableInventory(wasteResult.data, containersResult.data));
      setOldestInventoryError(false);
    }
    setIsOldestInventoryLoading(false);
  }, []);

  const loadOldestInventory = useCallback(async (): Promise<void> => {
    const requestRevision = ++inventoryRevisionRef.current;
    setIsOldestInventoryLoading(true);
    setOldestInventoryError(false);

    try {
      const [wasteResult, containersResult] = await Promise.all([
        listAvailableWasteRecords(),
        listContainers(),
      ]);
      applyOldestInventoryResults(wasteResult, containersResult, requestRevision);
    } catch {
      if (requestRevision !== inventoryRevisionRef.current) return;
      setOldestInventory([]);
      setOldestInventoryError(true);
      setIsOldestInventoryLoading(false);
    }
  }, [applyOldestInventoryResults]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void getReportStatistics()
      .then((result) => {
        applyStatisticsResult(result, requestRevision);
      })
      .catch(() => {
        if (requestRevision !== requestRevisionRef.current) return;
        setStatistics(null);
        setLoadError("dashboard.statisticsError");
        setIsLoading(false);
      });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyStatisticsResult, userId]);

  useEffect(() => {
    const requestRevision = ++salesRevisionRef.current;
    void listSales()
      .then((result) => {
        if (requestRevision !== salesRevisionRef.current) return;
        if (!result.ok) {
          setRecentSales([]);
          setRecentSalesError(true);
        } else {
          setRecentSales(sortSalesHistory(result.data, "newest").slice(0, 5));
        }
        setAreRecentSalesLoading(false);
      })
      .catch(() => {
        if (requestRevision !== salesRevisionRef.current) return;
        setRecentSales([]);
        setRecentSalesError(true);
        setAreRecentSalesLoading(false);
      });
    return () => {
      salesRevisionRef.current += 1;
    };
  }, [userId]);

  useEffect(() => {
    const requestRevision = ++inventoryRevisionRef.current;
    void Promise.all([listAvailableWasteRecords(), listContainers()])
      .then(([wasteResult, containersResult]) => {
        applyOldestInventoryResults(wasteResult, containersResult, requestRevision);
      })
      .catch(() => {
        if (requestRevision !== inventoryRevisionRef.current) return;
        setOldestInventory([]);
        setOldestInventoryError(true);
        setIsOldestInventoryLoading(false);
      });
    return () => {
      inventoryRevisionRef.current += 1;
    };
  }, [applyOldestInventoryResults, userId]);

  useEffect(() => {
    const syncTelemetry = (): void => {
      const requestRevision = ++telemetryRevisionRef.current;
      void fetchLatestTelemetryByContainer("CTR-BOG-001")
        .then((data) => {
          if (requestRevision !== telemetryRevisionRef.current) return;
          setLiveTelemetry(data);
        })
        .catch(() => {
          if (requestRevision !== telemetryRevisionRef.current) return;
          setLiveTelemetry(null);
        });
    };

    syncTelemetry();

    const intervalId = window.setInterval(syncTelemetry, 10000);

    return () => {
      telemetryRevisionRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(weightKg)} ${t("common.kg")}`;
  const formatPercentage = (percentage: number): string =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(percentage / 100);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const realValueUnavailable = isLoading || loadError !== null || statistics === null;
  const metricValue = (format: (data: ReportStatistics) => string): string =>
    realValueUnavailable || statistics === null ? "—" : format(statistics);
  const hasNoCommercialActivity = !realValueUnavailable && statistics !== null &&
    statistics.availableWeightKg === 0 && statistics.salesCount === 0;
  const topRevenueCategory = statistics === null
    ? null
    : findTopRevenueCategory(statistics.salesByCategory, statistics.grossSalesValue);

  return (
    <section className="p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 backdrop-blur-sm dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {t("dashboard.eyebrow")}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("dashboard.description")}
          </p>
        </div>

        {/* Sync Status Badge & Live Date */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>{i18n.resolvedLanguage === "en" ? "System online" : "Sistema en línea"}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dateFormatter.format(new Date())}
          </span>
        </div>
      </header>

      {isLoading && (
        <div role="status" className="glass-panel mt-6 flex items-center gap-3 rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-300">
          <LoaderCircle className="animate-spin text-emerald-600 dark:text-emerald-400" size={18} strokeWidth={1.8} aria-hidden="true" />
          {t("dashboard.loadingStatistics")}
        </div>
      )}

      {!isLoading && loadError && (
        <div role="alert" className="glass-panel mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(loadError)}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadStatistics()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("dashboard.retry")}
          </button>
        </div>
      )}

      {hasNoCommercialActivity && (
        <div
          role="status"
          className="glass-panel mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-emerald-500/30 p-4 text-sm text-slate-600 dark:text-slate-300"
        >
          <Info size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>{t("dashboard.emptyCommercialActivity")}</span>
        </div>
      )}

      <div className={`mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 ${showDemoData ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <MetricCard
          title={t("dashboard.registeredWaste")}
          value={metricValue((data) => formatWeight(data.totalRegisteredWeightKg))}
          description={t("dashboard.realWasteDescription")}
          icon={<Trash2 size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        />
        {showDemoData && (
          <MetricCard
            title={t("dashboard.activeSensors")}
            value="8"
            description={t("dashboard.registeredSensors", { count: 10 })}
            icon={<Radio size={22} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />}
          />
        )}
        <MetricCard
          title={t("dashboard.availableInventory")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("dashboard.materialForSale")}
          icon={<Boxes size={22} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        />
        <MetricCard
          title={t("dashboard.revenue")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("dashboard.accumulatedSales")}
          icon={<TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        />
      </div>

      {/* Primary Row: Top Revenue Category & Live IoT Sensors */}
      <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {/* Left Column: Categoría líder en ingresos */}
        <div className="glass-panel flex h-full min-w-0 flex-col justify-between rounded-2xl p-6" data-testid="top-revenue-category-card">
          <div>
            <div>
              <h2 id="top-revenue-category-title" className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.topRevenueCategory")}</h2>
              <p className="mt-0.5 text-xs text-ecoplaza-text-muted">{t("dashboard.topRevenueCategoryDescription")}</p>
            </div>

            {realValueUnavailable || topRevenueCategory === null ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Award size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">
                  {realValueUnavailable ? "—" : t("dashboard.topRevenueCategoryEmpty")}
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="glass-card rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5">
                  <p className="text-xs text-ecoplaza-text-muted">{t("common.category")}</p>
                  <p className="mt-1 text-base font-bold text-ecoplaza-text">{t(`common.${topRevenueCategory.category}`)}</p>
                </div>
                <div className="glass-card rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5">
                  <p className="text-xs text-ecoplaza-text-muted">{t("dashboard.revenue")}</p>
                  <p className="mt-1 text-base font-bold text-ecoplaza-primary">{currencyFormatter.format(topRevenueCategory.grossSalesValue)}</p>
                </div>
                <div className="glass-card rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5">
                  <p className="text-xs text-ecoplaza-text-muted">{t("dashboard.topRevenueCategoryParticipation")}</p>
                  <p className="mt-1 text-base font-bold text-ecoplaza-text">{formatPercentage(topRevenueCategory.revenuePercentage)}</p>
                </div>
                <div className="glass-card rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5">
                  <p className="text-xs text-ecoplaza-text-muted">{t("dashboard.topRevenueCategoryVolume")}</p>
                  <p className="mt-1 text-sm font-semibold text-ecoplaza-text">
                    {formatWeight(topRevenueCategory.soldWeightKg)} · {t("reports.buyerPurchases", { count: topRevenueCategory.salesCount })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Estado de sensores */}
        {(showDemoData || liveTelemetry !== null) && (
          <div className="glass-panel flex h-full min-w-0 flex-col justify-between rounded-2xl p-6" data-testid="dashboard-sensor-status-section">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.sensorStatus")}</h2>
                  <p className="mt-0.5 text-xs text-ecoplaza-text-muted">
                    {liveTelemetry !== null
                      ? t("dashboard.sensorMonitoring")
                      : t("dashboard.sensorMonitoringDemo")}
                  </p>
                </div>
                {liveTelemetry !== null && (
                  <span
                    data-testid="iot-live-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>IoT Live</span>
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {liveTelemetry !== null && (
                  <SensorStatusCard
                    name={liveTelemetry.containerId}
                    category={t("common.wasteRecyclable")}
                    fillLevel={liveTelemetry.fillPercentage}
                    status={
                      liveTelemetry.status === "critical"
                        ? "Critical"
                        : liveTelemetry.status === "warning"
                          ? "Warning"
                          : "Normal"
                    }
                    hasTelemetry={true}
                  />
                )}
                <SensorStatusCard name={`${t("waste.container")} 01`} category={t("common.wasteOrganic")} fillLevel={68} status={t("common.active")} />
                <SensorStatusCard name={`${t("waste.container")} 02`} category={t("common.wasteRecyclable")} fillLevel={42} status={t("common.active")} />
                <SensorStatusCard name={`${t("waste.container")} 03`} category={t("common.wasteNonRecyclable")} fillLevel={81} status={t("common.active")} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Row: Activity Tables & Aging Inventory */}
      <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {/* Left Column: Ventas recientes */}
        <div className="glass-panel flex h-full min-w-0 flex-col justify-between rounded-2xl p-6">
          <div className="shrink-0">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.recentSales")}</h2>
            <p className="mt-0.5 text-xs text-ecoplaza-text-muted">{t("dashboard.recentSalesDescription")}</p>
          </div>

          <div className="mt-4 flex min-w-0 flex-1 flex-col justify-between">
            {areRecentSalesLoading ? (
              <div role="status" className="flex min-h-[220px] flex-1 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
                <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
                {t("dashboard.loadingRecentSales")}
              </div>
            ) : recentSalesError ? (
              <div role="alert" className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <span>{t("dashboard.recentSalesError")}</span>
                <button type="button" onClick={() => void loadRecentSales()} className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 font-medium">
                  <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
                </button>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Receipt size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">{t("dashboard.recentSalesEmpty")}</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-2">
                <table data-testid="recent-sales-table" className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-left text-xs whitespace-nowrap text-ecoplaza-text-muted dark:border-white/10">
                      <th className="px-3 py-2 font-semibold">{t("common.date")}</th>
                      <th className="px-3 py-2 font-semibold">{t("buyers.buyer")}</th>
                      <th className="px-3 py-2 font-semibold">{t("common.category")}</th>
                      <th className="px-3 py-2 font-semibold">{t("sales.soldWeight")}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t("sales.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="border-t border-slate-200/40 transition-colors hover:bg-white/30 dark:border-white/5 dark:hover:bg-white/5" title={sale.id}>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text-muted">{dateFormatter.format(new Date(sale.soldAt))}</td>
                        <td className="max-w-[150px] truncate px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text" title={sale.buyerName}>{sale.buyerName}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text">{t(`common.${sale.category}`)}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text">{formatWeight(sale.weightKg)}</td>
                        <td className="px-3 py-3 text-right text-sm font-medium whitespace-nowrap text-ecoplaza-text">{currencyFormatter.format(sale.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 min-h-[1.25rem] shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Right Column: Inventario disponible más antiguo */}
        <div className="glass-panel flex h-full min-w-0 flex-col justify-between rounded-2xl p-6">
          <div className="shrink-0">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.oldestInventory")}</h2>
            <p className="mt-0.5 text-xs text-ecoplaza-text-muted">{t("dashboard.oldestInventoryDescription")}</p>
          </div>

          <div className="mt-4 flex min-w-0 flex-1 flex-col justify-between">
            {isOldestInventoryLoading ? (
              <div role="status" className="flex min-h-[220px] flex-1 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
                <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
                {t("dashboard.loadingOldestInventory")}
              </div>
            ) : oldestInventoryError ? (
              <div role="alert" className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <span>{t("dashboard.oldestInventoryError")}</span>
                <button type="button" onClick={() => void loadOldestInventory()} className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 font-medium">
                  <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
                </button>
              </div>
            ) : oldestInventory.length === 0 ? (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Clock size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">{t("dashboard.oldestInventoryEmpty")}</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-2">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-left text-xs whitespace-nowrap text-ecoplaza-text-muted dark:border-white/10">
                      <th className="px-3 py-2 font-semibold">{t("waste.record")}</th>
                      <th className="px-3 py-2 font-semibold">{t("common.category")}</th>
                      <th className="px-3 py-2 font-semibold">{t("inventory.weight")}</th>
                      <th className="px-3 py-2 font-semibold">{t("inventory.container")}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t("inventory.storageAge")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oldestInventory.map((item) => (
                      <tr key={item.id} data-testid="aging-inventory-row" className="border-t border-slate-200/40 transition-colors hover:bg-white/30 dark:border-white/5 dark:hover:bg-white/5" title={item.id}>
                        <td className="px-3 py-3 text-sm font-medium whitespace-nowrap text-ecoplaza-text">{item.reference}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text">{t(`common.${item.category}`)}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text">{formatWeight(item.weightKg)}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-ecoplaza-text">{item.containerCode ?? t("inventory.unknownContainer")}</td>
                        <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
                          <span className={item.ageDays > 30 ? "inline-flex items-center rounded-full border border-amber-300/60 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs backdrop-blur-md dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300" : "text-ecoplaza-text"}>
                            {t("inventory.storageAgeDays", { count: item.ageDays })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 min-h-[1.25rem] shrink-0">
              {!isOldestInventoryLoading && !oldestInventoryError && oldestInventory.some((item) => item.ageDays > 30) ? (
                <p className="text-xs text-ecoplaza-text-muted">{t("dashboard.olderThanThirtyNote")}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return user ? <UserDashboardPage key={user.id} userId={user.id} /> : null;
}

export default DashboardPage;
