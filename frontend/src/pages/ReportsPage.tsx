import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarRange, Download, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteDistributionChart from "../components/WasteDistributionChart";
import SuccessToast from "../components/SuccessToast";
import SalesTrendChart from "../components/SalesTrendChart";
import SalesCategoryPerformance from "../components/SalesCategoryPerformance";
import MonthlySalesSummary from "../components/MonthlySalesSummary";
import {
  getReportStatistics,
  type ReportErrorCode,
  type ReportStatistics,
} from "../services/reportService";
import {
  saveReportCsv,
  type ReportCsvLabels,
} from "../services/reportCsvService";
import { getCsvCategoryLabels } from "../services/csvCategoryLabels";
import {
  getReportDateRangePreset,
  isValidReportDateRange,
  type ReportDateRange,
  type ReportDateRangePreset,
} from "../services/reportDateRange";
import { getHighestRevenueDay } from "../services/reportCalculations";
import { saveReportExcel, type ReportExcelLabels } from "../services/reportExcelService";

function getReportErrorKey(code: ReportErrorCode): string {
  if (code === "unauthorized") return "reports.unauthorized";
  if (code === "network_error") return "reports.networkError";
  if (code === "permission_denied") return "reports.permissionError";
  return "reports.databaseError";
}

function UserReportsPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);
  const [exportNotice, setExportNotice] = useState<"csvSuccess" | "excelSuccess" | "error" | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDateRange, setActiveDateRange] = useState<ReportDateRange | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const applyResult = useCallback((
    result: Awaited<ReturnType<typeof getReportStatistics>>,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setStatistics(null);
      setLoadError(getReportErrorKey(result.error.code));
      setIsLoading(false);
      return;
    }

    setStatistics(result.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadReport = useCallback(async (dateRange?: ReportDateRange): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getReportStatistics(dateRange);
      applyResult(result, requestRevision);
    } catch {
      if (requestRevision !== requestRevisionRef.current) return;
      setStatistics(null);
      setLoadError("reports.databaseError");
      setIsLoading(false);
    }
  }, [applyResult]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void getReportStatistics()
      .then((result) => {
        applyResult(result, requestRevision);
      })
      .catch(() => {
        if (requestRevision !== requestRevisionRef.current) return;
        setStatistics(null);
        setLoadError("reports.databaseError");
        setIsLoading(false);
      });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyResult, userId]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const metricsUnavailable = isLoading || loadError !== null || statistics === null;
  const formatWeight = (weightKg: number): string =>
    `${numberFormatter.format(weightKg)} ${t("common.kg")}`;
  const metricValue = (format: (data: ReportStatistics) => string): string =>
    metricsUnavailable || statistics === null ? "—" : format(statistics);
  const isFiltered = activeDateRange !== null;
  const isEmptyPeriod = isFiltered && statistics !== null &&
    statistics.wasteRecordCount === 0 && statistics.salesCount === 0;
  const highestRevenueDay = statistics === null
    ? null
    : getHighestRevenueDay(statistics.salesTrend);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const formatInputDate = (value: string): string =>
    dateFormatter.format(new Date(`${value}T00:00:00`));

  const applyDateRange = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextRange = { startDate, endDate };

    if (!isValidReportDateRange(nextRange)) {
      setDateRangeError("reports.invalidDateRange");
      return;
    }

    setDateRangeError(null);
    setActiveDateRange(nextRange);
    void loadReport(nextRange);
  };

  const clearDateRange = (): void => {
    setStartDate("");
    setEndDate("");
    setDateRangeError(null);
    setActiveDateRange(null);
    void loadReport();
  };

  const applyDateRangePreset = (preset: ReportDateRangePreset): void => {
    const nextRange = getReportDateRangePreset(preset);
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
    setDateRangeError(null);
    setActiveDateRange(nextRange);
    void loadReport(nextRange);
  };

  const exportReport = async (): Promise<void> => {
    if (statistics === null || exportKind !== null) return;

    setExportKind("csv");
    setExportNotice(null);

    const labels: ReportCsvLabels = {
      section: t("reports.csv.section"),
      metric: t("reports.csv.metric"),
      value: t("reports.csv.value"),
      unit: t("reports.csv.unit"),
      summary: t("reports.csv.summary"),
      distribution: t("reports.csv.distribution"),
      salesPerformance: t("reports.csv.salesPerformance"),
      salesTrend: t("reports.csv.salesTrend"),
      date: t("reports.csv.date"),
      category: t("reports.csv.category"),
      weight: t("reports.csv.weight"),
      percentage: t("reports.csv.percentage"),
      records: t("reports.wasteRecords"),
      historicalWeight: t("reports.historicalWeight"),
      availableWeight: t("reports.availableWeight"),
      soldWeight: t("reports.soldWeight"),
      sales: t("reports.salesCount"),
      grossRevenue: t("reports.grossSales"),
      averagePricePerKg: t("reports.csv.averagePricePerKg"),
      countUnit: t("reports.csv.countUnit"),
      kilogramsUnit: t("common.kg"),
      copUnit: t("reports.csv.copUnit"),
      period: t("reports.csv.period"),
      from: t("reports.csv.from"),
      to: t("reports.csv.to"),
      allTime: t("reports.csv.allTime"),
      categories: getCsvCategoryLabels(t),
    };

    try {
      const result = await saveReportCsv(
        statistics,
        labels,
        activeDateRange === null
          ? `ecoplaza-report-${new Date().toISOString().slice(0, 10)}.csv`
          : `ecoplaza-report-${activeDateRange.startDate}-${activeDateRange.endDate}.csv`,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        activeDateRange ?? undefined,
      );
      if (result === "saved") setExportNotice("csvSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  const exportReportExcel = async (): Promise<void> => {
    if (statistics === null || exportKind !== null) return;

    setExportKind("excel");
    setExportNotice(null);
    const labels: ReportExcelLabels = {
      workbookTitle: t("reports.excel.workbookTitle"),
      summarySheet: t("reports.excel.summarySheet"),
      distributionSheet: t("reports.excel.distributionSheet"),
      performanceSheet: t("reports.excel.performanceSheet"),
      trendSheet: t("reports.excel.trendSheet"),
      monthlySheet: t("reports.excel.monthlySheet"),
      metric: t("reports.csv.metric"), value: t("reports.csv.value"), unit: t("reports.csv.unit"),
      category: t("reports.csv.category"), weight: t("reports.csv.weight"), percentage: t("reports.csv.percentage"),
      sales: t("reports.salesCount"), grossRevenue: t("reports.grossSales"), averagePricePerKg: t("reports.csv.averagePricePerKg"), date: t("reports.csv.date"),
      month: t("reports.month"), revenueChange: t("reports.revenueChange"), averagePerOperation: t("reports.averagePerOperation"),
      records: t("reports.wasteRecords"), historicalWeight: t("reports.historicalWeight"),
      availableWeight: t("reports.availableWeight"), soldWeight: t("reports.soldWeight"),
      period: t("reports.csv.period"), from: t("reports.csv.from"), to: t("reports.csv.to"), allTime: t("reports.csv.allTime"),
      countUnit: t("reports.csv.countUnit"), kilogramsUnit: t("common.kg"), copUnit: t("reports.csv.copUnit"),
      categories: getCsvCategoryLabels(t),
    };

    try {
      const result = await saveReportExcel(
        statistics,
        labels,
        activeDateRange === null
          ? `ecoplaza-report-${new Date().toISOString().slice(0, 10)}.xlsx`
          : `ecoplaza-report-${activeDateRange.startDate}-${activeDateRange.endDate}.xlsx`,
        activeDateRange ?? undefined,
      );
      if (result === "saved") setExportNotice("excelSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  return (
    <section className="p-4 md:p-8">
      <PageHeader
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
      />

      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          onClick={() => void exportReport()}
          disabled={metricsUnavailable || exportKind !== null}
          className="flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-xs transition-colors hover:bg-emerald-600/20 active:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
        >
          {exportKind === "csv" ? (
            <LoaderCircle className="animate-spin text-emerald-600 dark:text-emerald-400" size={17} aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          <span>{exportKind === "csv" ? t("reports.exporting") : t("reports.exportCsv")}</span>
        </button>
        <button
          type="button"
          onClick={() => void exportReportExcel()}
          disabled={metricsUnavailable || exportKind !== null}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportKind === "excel" ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          <span>{exportKind === "excel" ? t("reports.exportingExcel") : t("reports.exportExcel")}</span>
        </button>
      </div>

      <form
        onSubmit={applyDateRange}
        className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-xs backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div className="flex flex-col gap-4 border-b border-ecoplaza-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CalendarRange size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ecoplaza-text">{t("reports.dateRange")}</h2>
              <p className="text-xs text-ecoplaza-text-muted">{t("reports.dateRangeDescription")}</p>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ecoplaza-border/60 bg-ecoplaza-background/80 p-1"
            aria-label={t("reports.quickRanges")}
          >
            {(["last7Days", "last30Days", "currentMonth"] as const).map((preset) => {
              const presetRange = getReportDateRangePreset(preset);
              const isSelected =
                activeDateRange?.startDate === presetRange.startDate &&
                activeDateRange?.endDate === presetRange.endDate;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={isLoading}
                  onClick={() => applyDateRangePreset(preset)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-ecoplaza-text hover:bg-ecoplaza-surface hover:text-emerald-600 dark:hover:text-emerald-400"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {t(`reports.${preset}`)}
                </button>
              );
            })}
            <button
              type="button"
              disabled={isLoading || (!isFiltered && startDate === "" && endDate === "")}
              onClick={clearDateRange}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                !isFiltered && startDate === "" && endDate === ""
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-ecoplaza-text hover:bg-ecoplaza-surface hover:text-emerald-600 dark:hover:text-emerald-400"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {t("reports.allHistory")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
            {t("reports.startDate")}
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              required
              disabled={isLoading}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5 block h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
            {t("reports.endDate")}
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              required
              disabled={isLoading}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1.5 block h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.applyDateRange")}
          </button>
          <button
            type="button"
            disabled={isLoading || (!isFiltered && startDate === "" && endDate === "")}
            onClick={clearDateRange}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 text-sm font-medium text-ecoplaza-text shadow-xs transition-colors hover:bg-ecoplaza-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.clearDateRange")}
          </button>
        </div>

        {dateRangeError !== null && (
          <p role="alert" className="mt-3 text-xs font-medium text-ecoplaza-danger">{t(dateRangeError)}</p>
        )}
        {activeDateRange !== null && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {t("reports.activeDateRange", {
              start: formatInputDate(activeDateRange.startDate),
              end: formatInputDate(activeDateRange.endDate),
            })}
          </p>
        )}
      </form>

      {isLoading && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          {t("reports.loading")}
        </div>
      )}

      {!isLoading && loadError && (
        <div
          role="alert"
          className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-ecoplaza-danger/30 bg-ecoplaza-danger/10 px-4 py-3 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3 text-sm text-ecoplaza-danger">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(loadError)}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadReport(activeDateRange ?? undefined)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 text-sm font-medium text-ecoplaza-danger"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("reports.retry")}
          </button>
        </div>
      )}

      {!isLoading && loadError === null && isEmptyPeriod && (
        <div role="status" className="mt-6 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted">
          {t("reports.emptyPeriod")}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title={t("reports.wasteRecords")}
          value={metricValue((data) => numberFormatter.format(data.wasteRecordCount))}
          description={t("reports.wasteRecordsDescription")}
        />
        <MetricCard
          title={t("reports.historicalWeight")}
          value={metricValue((data) => formatWeight(data.totalRegisteredWeightKg))}
          description={t("reports.historicalWeightDescription")}
        />
        <MetricCard
          title={t("reports.availableWeight")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("reports.availableWeightDescription")}
        />
        <MetricCard
          title={t("reports.soldWeight")}
          value={metricValue((data) => formatWeight(data.soldWeightKg))}
          description={t("reports.soldWeightDescription")}
        />
        <MetricCard
          title={t("reports.salesCount")}
          value={metricValue((data) => numberFormatter.format(data.salesCount))}
          description={t("reports.salesCountDescription")}
        />
        <MetricCard
          title={t("reports.grossSales")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("reports.grossSalesDescription")}
        />
        <MetricCard
          title={t("reports.highestRevenueDay")}
          value={metricsUnavailable || highestRevenueDay === null ? "—" : currencyFormatter.format(highestRevenueDay.grossSalesValue)}
          description={metricsUnavailable
            ? t("reports.highestRevenueDayDescription")
            : highestRevenueDay === null
              ? t("reports.highestRevenueDayEmpty")
              : t("reports.highestRevenueDayDetail", {
                  date: formatInputDate(highestRevenueDay.date),
                  count: highestRevenueDay.salesCount,
                })}
        />
      </div>

      {!metricsUnavailable && statistics !== null && (
        <div className="mt-8 space-y-8">
          <WasteDistributionChart data={statistics.distribution} isFiltered={isFiltered} />
          <SalesCategoryPerformance data={statistics.salesByCategory} isFiltered={isFiltered} />
          <MonthlySalesSummary data={statistics.monthlySales} isFiltered={isFiltered} />
          <section className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5" aria-labelledby="top-buyers-title">
            <h2 id="top-buyers-title" className="text-base font-semibold text-ecoplaza-text">{t("reports.topBuyers")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("reports.topBuyersDescription")}</p>
            {statistics.topBuyers.length === 0 ? (
              <p className="mt-4 text-sm text-ecoplaza-text-muted">{t(isFiltered ? "reports.emptyTopBuyersPeriod" : "reports.emptyTopBuyers")}</p>
            ) : (
              <ol className="mt-4 divide-y divide-ecoplaza-border">
                {statistics.topBuyers.map((buyer, index) => (
                  <li key={buyer.buyerId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center">
                    <div className="min-w-0"><span className="mr-2 text-xs font-semibold text-ecoplaza-primary">#{index + 1}</span><span className="font-medium text-ecoplaza-text">{buyer.buyerName}</span></div>
                    <span className="text-sm text-ecoplaza-text-muted tabular-nums">{t("reports.buyerPurchases", { count: buyer.purchaseCount })}</span>
                    <span className="text-sm text-ecoplaza-text tabular-nums">{formatWeight(buyer.purchasedWeightKg)}</span>
                    <span className="text-sm font-semibold text-ecoplaza-primary tabular-nums">{currencyFormatter.format(buyer.totalPurchasedValue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <SalesTrendChart data={statistics.salesTrend} isFiltered={isFiltered} />
        </div>
      )}

      {exportNotice !== null && (
        <SuccessToast
          title={t(exportNotice === "csvSuccess"
            ? "reports.exportSuccessTitle"
            : exportNotice === "excelSuccess"
              ? "reports.excelExportSuccessTitle"
              : "reports.exportErrorTitle")}
          description={t(exportNotice === "csvSuccess"
            ? "reports.exportSuccessDescription"
            : exportNotice === "excelSuccess"
              ? "reports.excelExportSuccessDescription"
              : "reports.exportErrorDescription")}
          closeLabel={t("reports.dismissNotification")}
          variant={exportNotice === "error" ? "error" : "success"}
          onClose={() => setExportNotice(null)}
        />
      )}
    </section>
  );
}

function ReportsPage() {
  const { user } = useAuth();
  return user ? <UserReportsPage key={user.id} userId={user.id} /> : null;
}

export default ReportsPage;
