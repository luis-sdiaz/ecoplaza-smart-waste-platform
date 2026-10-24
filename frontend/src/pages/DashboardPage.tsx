import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Boxes,
  Clock,
  Info,
  LoaderCircle,
  PackageOpen,
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
import WasteSummaryCard from "../components/WasteSummaryCard";
import {
  getReportStatistics,
  type ReportErrorCode,
  type ReportStatistics,
  type ReportWasteCategory,
} from "../services/reportService";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import { calculateMaterialStatusBreakdown } from "../services/dashboardMaterialStatus";
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
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<SaleHistoryItem[]>([]);
  const [areRecentSalesLoading, setAreRecentSalesLoading] = useState(true);
  const [recentSalesError, setRecentSalesError] = useState(false);
  const [oldestInventory, setOldestInventory] = useState<AgingInventoryItem[]>([]);
  const [isOldestInventoryLoading, setIsOldestInventoryLoading] = useState(true);
  const [oldestInventoryError, setOldestInventoryError] = useState(false);

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
  const categoryValue = (
    category: ReportWasteCategory,
    field: "weightKg" | "percentage",
  ): number => statistics?.distribution.find((item) => item.category === category)?.[field] ?? 0;
  const demoBadge = t("dashboard.demoData");
  const realBadge = t("dashboard.realData");
  const hasNoCommercialActivity = !realValueUnavailable && statistics !== null &&
    statistics.availableWeightKg === 0 && statistics.salesCount === 0;
  const materialStatus = statistics === null ? null : calculateMaterialStatusBreakdown(
    statistics.totalRegisteredWeightKg,
    statistics.availableWeightKg,
    statistics.soldWeightKg,
  );
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
        <div role="alert" className="glass-panel mt-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-3 text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(loadError)}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadStatistics()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-400"
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
          badge={realBadge}
          icon={<Trash2 size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        />
        {showDemoData && (
          <MetricCard
            title={t("dashboard.activeSensors")}
            value="8"
            description={t("dashboard.registeredSensors", { count: 10 })}
            badge={demoBadge}
            badgeVariant="demo"
            icon={<Radio size={22} className="text-sky-600 dark:text-sky-400" aria-hidden="true" />}
          />
        )}
        <MetricCard
          title={t("dashboard.availableInventory")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("dashboard.materialForSale")}
          badge={realBadge}
          icon={<Boxes size={22} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        />
        <MetricCard
          title={t("dashboard.revenue")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("dashboard.accumulatedSales")}
          badge={realBadge}
          icon={<TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        />
      </div>

      {/* Bento Grid Architecture: 12 Columns */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Column (8 cols): Material status, Recent sales, Waste by category */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Section: Estado del material */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.materialStatus")}</h2>
                <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.materialStatusDescription")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {realBadge}
              </span>
            </div>
            {realValueUnavailable || materialStatus === null ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <PackageOpen size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">
                  {realValueUnavailable ? "—" : t("dashboard.materialStatusUnavailable")}
                </p>
              </div>
            ) : materialStatus.totalWeightKg === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <PackageOpen size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">
                  {t("dashboard.materialStatusEmpty")}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10" aria-label={t("dashboard.materialStatusChart")}>
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${materialStatus.availablePercentage}%` }} />
                  <span className="bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${materialStatus.soldPercentage}%` }} />
                  <span className="bg-slate-300 dark:bg-white/20" style={{ width: `${materialStatus.otherPercentage}%` }} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {([
                    ["available", materialStatus.availableWeightKg, materialStatus.availablePercentage],
                    ["sold", materialStatus.soldWeightKg, materialStatus.soldPercentage],
                    ["other", materialStatus.otherWeightKg, materialStatus.otherPercentage],
                  ] as const).map(([status, weight, percentage]) => (
                    <div key={status} className="glass-card rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5">
                      <p className="text-xs text-ecoplaza-text-muted">{t(`dashboard.materialStatus${status[0].toUpperCase()}${status.slice(1)}`)}</p>
                      <p className="mt-1 text-sm font-semibold text-ecoplaza-text">{formatWeight(weight)} · {formatPercentage(percentage)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Section: Ventas recientes */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.recentSales")}</h2>
                <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.recentSalesDescription")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {realBadge}
              </span>
            </div>
            {areRecentSalesLoading ? (
              <div role="status" className="mt-4 flex min-h-24 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
                <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
                {t("dashboard.loadingRecentSales")}
              </div>
            ) : recentSalesError ? (
              <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                <span>{t("dashboard.recentSalesError")}</span>
                <button type="button" onClick={() => void loadRecentSales()} className="flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 font-medium">
                  <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
                </button>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Receipt size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">{t("dashboard.recentSalesEmpty")}</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-left text-xs text-ecoplaza-text-muted dark:border-white/10">
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
                        <td className="px-3 py-3 text-sm text-ecoplaza-text-muted">{dateFormatter.format(new Date(sale.soldAt))}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{sale.buyerName}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{t(`common.${sale.category}`)}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{formatWeight(sale.weightKg)}</td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-ecoplaza-text">{currencyFormatter.format(sale.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Residuos por categoría */}
          <div className="glass-panel rounded-2xl p-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.wasteByCategory")}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  {t("dashboard.realData")}
                </span>
              </div>
              <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.realWasteDistribution")}</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <WasteSummaryCard
                title={t("common.organic")}
                amount={realValueUnavailable ? "—" : formatWeight(categoryValue("organic", "weightKg"))}
                percentage={realValueUnavailable ? 0 : categoryValue("organic", "percentage")}
                percentageLabel={realValueUnavailable ? "—" : formatPercentage(categoryValue("organic", "percentage"))}
              />
              <WasteSummaryCard
                title={t("common.recyclable")}
                amount={realValueUnavailable ? "—" : formatWeight(categoryValue("recyclable", "weightKg"))}
                percentage={realValueUnavailable ? 0 : categoryValue("recyclable", "percentage")}
                percentageLabel={realValueUnavailable ? "—" : formatPercentage(categoryValue("recyclable", "percentage"))}
              />
              <WasteSummaryCard
                title={t("common.nonRecyclable")}
                amount={realValueUnavailable ? "—" : formatWeight(categoryValue("nonRecyclable", "weightKg"))}
                percentage={realValueUnavailable ? 0 : categoryValue("nonRecyclable", "percentage")}
                percentageLabel={realValueUnavailable ? "—" : formatPercentage(categoryValue("nonRecyclable", "percentage"))}
              />
            </div>
          </div>
        </div>

        {/* Lateral Column of Telemetry & Leaders (4 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Section: Estado de sensores (Demo) */}
          {showDemoData && (
            <div className="glass-panel rounded-2xl p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.sensorStatus")}</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs backdrop-blur-md dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                    {demoBadge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.sensorMonitoringDemo")}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <SensorStatusCard name={`${t("waste.container")} 01`} category={t("common.wasteOrganic")} fillLevel={68} status={t("common.active")} />
                <SensorStatusCard name={`${t("waste.container")} 02`} category={t("common.wasteRecyclable")} fillLevel={42} status={t("common.active")} />
                <SensorStatusCard name={`${t("waste.container")} 03`} category={t("common.wasteNonRecyclable")} fillLevel={81} status={t("common.active")} />
              </div>
            </div>
          )}

          {/* Section: Categoría líder en ingresos */}
          <div className="glass-panel rounded-2xl p-6" data-testid="top-revenue-category-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="top-revenue-category-title" className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.topRevenueCategory")}</h2>
                <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.topRevenueCategoryDescription")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {realBadge}
              </span>
            </div>

            {realValueUnavailable || topRevenueCategory === null ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Award size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">
                  {realValueUnavailable ? "—" : t("dashboard.topRevenueCategoryEmpty")}
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
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

          {/* Section: Inventario disponible más antiguo */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.oldestInventory")}</h2>
                <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.oldestInventoryDescription")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {realBadge}
              </span>
            </div>
            {isOldestInventoryLoading ? (
              <div role="status" className="mt-4 flex min-h-24 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
                <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
                {t("dashboard.loadingOldestInventory")}
              </div>
            ) : oldestInventoryError ? (
              <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                <span>{t("dashboard.oldestInventoryError")}</span>
                <button type="button" onClick={() => void loadOldestInventory()} className="flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 font-medium">
                  <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
                </button>
              </div>
            ) : oldestInventory.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Clock size={28} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <p className="text-sm text-ecoplaza-text-muted">{t("dashboard.oldestInventoryEmpty")}</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-left text-xs text-ecoplaza-text-muted dark:border-white/10">
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
                        <td className="px-3 py-3 text-sm font-medium text-ecoplaza-text">{item.reference}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{t(`common.${item.category}`)}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{formatWeight(item.weightKg)}</td>
                        <td className="px-3 py-3 text-sm text-ecoplaza-text">{item.containerCode ?? t("inventory.unknownContainer")}</td>
                        <td className="px-3 py-3 text-right text-sm">
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
            {!isOldestInventoryLoading && !oldestInventoryError && oldestInventory.some((item) => item.ageDays > 30) && (
              <p className="mt-3 text-xs text-ecoplaza-text-muted">{t("dashboard.olderThanThirtyNote")}</p>
            )}
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
