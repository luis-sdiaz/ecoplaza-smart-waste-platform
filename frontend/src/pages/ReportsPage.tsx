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
  const metricBadge = t(isFiltered ? "reports.filteredData" : "reports.realData");
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
      metric: t("reports.csv.metric"), value: t("reports.csv.value"), unit: t("reports.csv.unit"),
      category: t("reports.csv.category"), weight: t("reports.csv.weight"), percentage: t("reports.csv.percentage"),
      sales: t("reports.salesCount"), grossRevenue: t("reports.grossSales"), averagePricePerKg: t("reports.csv.averagePricePerKg"), date: t("reports.csv.date"),
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

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => void exportReport()}
          disabled={metricsUnavailable || exportKind !== null}
          className="flex items-center gap-2 rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportKind === "csv" ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          {exportKind === "csv" ? t("reports.exporting") : t("reports.exportCsv")}
        </button>
        <button
          type="button"
          onClick={() => void exportReportExcel()}
          disabled={metricsUnavailable || exportKind !== null}
          className="flex items-center gap-2 rounded-xl bg-ecoplaza-secondary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportKind === "excel" ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          {exportKind === "excel" ? t("reports.exportingExcel") : t("reports.exportExcel")}
        </button>
      </div>

      <form
        onSubmit={applyDateRange}
        className="mt-6 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5"
      >
        <div className="flex items-start gap-3">
          <CalendarRange className="mt-0.5 text-ecoplaza-primary" size={20} aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-ecoplaza-text">{t("reports.dateRange")}</h2>
            <p className="mt-1 text-xs text-ecoplaza-text-muted">{t("reports.dateRangeDescription")}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label={t("reports.quickRanges")}>
          {(["last7Days", "last30Days", "currentMonth"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isLoading}
              onClick={() => applyDateRangePreset(preset)}
              className="rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(`reports.${preset}`)}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading || (!isFiltered && startDate === "" && endDate === "")}
            onClick={clearDateRange}
            className="rounded-lg border border-ecoplaza-border px-3 py-2 text-xs font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.allHistory")}
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label className="text-xs font-medium text-ecoplaza-text-muted">
            {t("reports.startDate")}
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              required
              disabled={isLoading}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text"
            />
          </label>
          <label className="text-xs font-medium text-ecoplaza-text-muted">
            {t("reports.endDate")}
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              required
              disabled={isLoading}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-ecoplaza-secondary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.applyDateRange")}
          </button>
          <button
            type="button"
            disabled={isLoading || (!isFiltered && startDate === "" && endDate === "")}
            onClick={clearDateRange}
            className="rounded-lg border border-ecoplaza-border px-4 py-2 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reports.clearDateRange")}
          </button>
        </div>
        {dateRangeError !== null && (
          <p role="alert" className="mt-3 text-sm text-ecoplaza-danger">{t(dateRangeError)}</p>
        )}
        {activeDateRange !== null && (
          <p className="mt-3 text-sm font-medium text-ecoplaza-primary">
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

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title={t("reports.wasteRecords")}
          value={metricValue((data) => numberFormatter.format(data.wasteRecordCount))}
          description={t("reports.wasteRecordsDescription")}
          badge={metricBadge}
        />
        <MetricCard
          title={t("reports.historicalWeight")}
          value={metricValue((data) => formatWeight(data.totalRegisteredWeightKg))}
          description={t("reports.historicalWeightDescription")}
          badge={metricBadge}
        />
        <MetricCard
          title={t("reports.availableWeight")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("reports.availableWeightDescription")}
          badge={metricBadge}
        />
        <MetricCard
          title={t("reports.soldWeight")}
          value={metricValue((data) => formatWeight(data.soldWeightKg))}
          description={t("reports.soldWeightDescription")}
          badge={metricBadge}
        />
        <MetricCard
          title={t("reports.salesCount")}
          value={metricValue((data) => numberFormatter.format(data.salesCount))}
          description={t("reports.salesCountDescription")}
          badge={metricBadge}
        />
        <MetricCard
          title={t("reports.grossSales")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("reports.grossSalesDescription")}
          badge={metricBadge}
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
          badge={metricBadge}
        />
      </div>

      {!metricsUnavailable && statistics !== null && (
        <div className="mt-8 space-y-8">
          <WasteDistributionChart data={statistics.distribution} isFiltered={isFiltered} />
          <SalesCategoryPerformance data={statistics.salesByCategory} isFiltered={isFiltered} />
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
