import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
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

      {hasNoCommercialActivity && (
        <div role="status" className="mt-6 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted">
          {t("dashboard.emptyCommercialActivity")}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("dashboard.registeredWaste")}
          value={metricValue((data) => formatWeight(data.totalRegisteredWeightKg))}
          description={t("dashboard.realWasteDescription")}
          badge={realBadge}
        />
        <MetricCard
          title={t("dashboard.activeSensors")}
          value="8"
          description={t("dashboard.registeredSensors", { count: 10 })}
          badge={demoBadge}
        />
        <MetricCard
          title={t("dashboard.availableInventory")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("dashboard.materialForSale")}
          badge={realBadge}
        />
        <MetricCard
          title={t("dashboard.revenue")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("dashboard.accumulatedSales")}
          badge={realBadge}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.materialStatus")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.materialStatusDescription")}</p>
          </div>
          <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{realBadge}</span>
        </div>
        {realValueUnavailable || materialStatus === null ? (
          <p className="mt-4 text-sm text-ecoplaza-text-muted">{realValueUnavailable ? "—" : t("dashboard.materialStatusUnavailable")}</p>
        ) : materialStatus.totalWeightKg === 0 ? (
          <p className="mt-4 text-sm text-ecoplaza-text-muted">{t("dashboard.materialStatusEmpty")}</p>
        ) : (
          <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-ecoplaza-background" aria-label={t("dashboard.materialStatusChart")}>
              <span className="bg-ecoplaza-primary" style={{ width: `${materialStatus.availablePercentage}%` }} />
              <span className="bg-ecoplaza-secondary" style={{ width: `${materialStatus.soldPercentage}%` }} />
              <span className="bg-ecoplaza-text-muted/30" style={{ width: `${materialStatus.otherPercentage}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                ["available", materialStatus.availableWeightKg, materialStatus.availablePercentage],
                ["sold", materialStatus.soldWeightKg, materialStatus.soldPercentage],
                ["other", materialStatus.otherWeightKg, materialStatus.otherPercentage],
              ] as const).map(([status, weight, percentage]) => (
                <div key={status} className="rounded-xl bg-ecoplaza-background p-3">
                  <p className="text-xs text-ecoplaza-text-muted">{t(`dashboard.materialStatus${status[0].toUpperCase()}${status.slice(1)}`)}</p>
                  <p className="mt-1 text-sm font-semibold text-ecoplaza-text">{formatWeight(weight)} · {formatPercentage(percentage)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.recentSales")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.recentSalesDescription")}</p>
          </div>
          <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{realBadge}</span>
        </div>
        {areRecentSalesLoading ? (
          <div role="status" className="mt-4 flex min-h-24 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
            <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
            {t("dashboard.loadingRecentSales")}
          </div>
        ) : recentSalesError ? (
          <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-ecoplaza-danger/10 px-4 py-3 text-sm text-ecoplaza-danger">
            <span>{t("dashboard.recentSalesError")}</span>
            <button type="button" onClick={() => void loadRecentSales()} className="flex items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 font-medium">
              <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
            </button>
          </div>
        ) : recentSales.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ecoplaza-background px-4 py-6 text-center text-sm text-ecoplaza-text-muted">{t("dashboard.recentSalesEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs text-ecoplaza-text-muted">
                  <th className="px-3 py-2 font-semibold">{t("common.date")}</th>
                  <th className="px-3 py-2 font-semibold">{t("buyers.buyer")}</th>
                  <th className="px-3 py-2 font-semibold">{t("common.category")}</th>
                  <th className="px-3 py-2 font-semibold">{t("sales.soldWeight")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("sales.total")}</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-t border-ecoplaza-border" title={sale.id}>
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

      <div className="mt-8 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("dashboard.oldestInventory")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("dashboard.oldestInventoryDescription")}</p>
          </div>
          <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{realBadge}</span>
        </div>
        {isOldestInventoryLoading ? (
          <div role="status" className="mt-4 flex min-h-24 items-center justify-center gap-2 text-sm text-ecoplaza-text-muted">
            <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} aria-hidden="true" />
            {t("dashboard.loadingOldestInventory")}
          </div>
        ) : oldestInventoryError ? (
          <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-ecoplaza-danger/10 px-4 py-3 text-sm text-ecoplaza-danger">
            <span>{t("dashboard.oldestInventoryError")}</span>
            <button type="button" onClick={() => void loadOldestInventory()} className="flex items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 font-medium">
              <RefreshCw size={15} aria-hidden="true" />{t("dashboard.retry")}
            </button>
          </div>
        ) : oldestInventory.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ecoplaza-background px-4 py-6 text-center text-sm text-ecoplaza-text-muted">{t("dashboard.oldestInventoryEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead><tr className="text-left text-xs text-ecoplaza-text-muted">
                <th className="px-3 py-2 font-semibold">{t("waste.record")}</th>
                <th className="px-3 py-2 font-semibold">{t("common.category")}</th>
                <th className="px-3 py-2 font-semibold">{t("inventory.weight")}</th>
                <th className="px-3 py-2 font-semibold">{t("inventory.container")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("inventory.storageAge")}</th>
              </tr></thead>
              <tbody>
                {oldestInventory.map((item) => (
                  <tr key={item.id} data-testid="aging-inventory-row" className="border-t border-ecoplaza-border" title={item.id}>
                    <td className="px-3 py-3 text-sm font-medium text-ecoplaza-text">{item.reference}</td>
                    <td className="px-3 py-3 text-sm text-ecoplaza-text">{t(`common.${item.category}`)}</td>
                    <td className="px-3 py-3 text-sm text-ecoplaza-text">{formatWeight(item.weightKg)}</td>
                    <td className="px-3 py-3 text-sm text-ecoplaza-text">{item.containerCode ?? t("inventory.unknownContainer")}</td>
                    <td className="px-3 py-3 text-right text-sm">
                      <span className={item.ageDays > 30 ? "rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800" : "text-ecoplaza-text"}>
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
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return user ? <UserDashboardPage key={user.id} userId={user.id} /> : null;
}

export default DashboardPage;
