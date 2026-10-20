import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Database, Download, LoaderCircle, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { Buyer } from "../services/buyerService";
import type { Container } from "../services/containerService";
import {
  createSale,
  getSaleFormData,
  listSales,
  type SaleHistoryItem,
  type SalesErrorCode,
} from "../services/salesService";
import type { RemoteWasteRecord } from "../services/wasteService";
import DemoSalesTable, { type DemoSale } from "../components/DemoSalesTable";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SaleRegistrationModal, {
  type SaleRegistrationValues,
} from "../components/SaleRegistrationModal";
import SaleDetailsModal from "../components/SaleDetailsModal";
import SalesTable from "../components/SalesTable";
import SuccessToast from "../components/SuccessToast";
import DateRangePickerButton from "../components/common/DateRangePickerButton";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import {
  exportSalesHistory,
  type SalesCsvLabels,
} from "../services/salesCsvService";
import { getCsvCategoryLabels } from "../services/csvCategoryLabels";
import {
  isValidReportDateRange,
  toTimestampRange,
  type ReportDateRange,
  type TimestampRange,
} from "../services/reportDateRange";
import {
  filterSalesHistory,
  RequestRevisionTracker,
  sortSalesHistory,
  type SalesSortOption,
  type WasteCategoryFilter,
} from "../services/coreWorkflow";
import {
  MAX_MONETARY_FRACTION_DIGITS,
  sumSafeMonetaryValues,
} from "../services/monetarySafety";
import { getSalesEmptyState } from "../services/salesEmptyState";
import { calculateAverageSellingPricePerKg, summarizeSalesByCategory } from "../services/salesMetrics";
import { filterSalesByAmount, parseSalesAmountRange } from "../services/salesAmountRange";
import { exportSalesExcel, type SalesExcelLabels } from "../services/salesExcelService";

const demoSales: DemoSale[] = [
  { id: "SAL-001", buyer: "Reciclar del Sur", material: "Reciclables", quantity: 80, total: 640000, date: "03/10/2026", status: "Completada" },
  { id: "SAL-002", buyer: "BioCompost Nariño", material: "Orgánicos", quantity: 72, total: 540000, date: "02/10/2026", status: "Completada" },
  { id: "SAL-003", buyer: "EcoMercado Local", material: "Reciclables", quantity: 90, total: 780000, date: "01/10/2026", status: "Completada" },
  { id: "SAL-004", buyer: "Reciclar del Sur", material: "Reciclables", quantity: 70, total: 520000, date: "30/09/2026", status: "Completada" },
];

type SalesNotification = {
  id: number;
  variant: "success" | "error";
  titleKey: string;
  descriptionKey: string;
};

type SalesListResult = Awaited<ReturnType<typeof listSales>>;
type SaleFormDataResult = Awaited<ReturnType<typeof getSaleFormData>>;

function getSalesErrorKey(code: SalesErrorCode): string {
  if (code === "unauthorized") return "sales.unauthorized";
  if (code === "invalid_buyer") return "sales.invalidBuyer";
  if (code === "invalid_waste_record") return "sales.invalidWasteRecord";
  if (code === "invalid_unit_price") return "sales.invalidUnitPrice";
  if (code === "buyer_not_available") return "sales.buyerNotAvailable";
  if (code === "waste_not_available") return "sales.wasteNotAvailable";
  if (code === "request_in_progress") return "sales.requestInProgress";
  if (code === "confirmation_unknown") return "sales.confirmationUnknown";
  if (code === "network_error") return "sales.networkError";
  if (code === "permission_denied") return "sales.permissionError";
  if (code === "constraint_violation") return "sales.constraintError";
  return "sales.databaseError";
}

async function fetchSalesPageData(
  dateRange?: TimestampRange,
  buyerId?: string,
): Promise<{
  salesResult: SalesListResult;
  formDataResult: SaleFormDataResult;
}> {
  const [salesResult, formDataResult] = await Promise.all([
    listSales(dateRange, buyerId),
    getSaleFormData(),
  ]);
  return { salesResult, formDataResult };
}

function UserSalesPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const { showDemoData } = useDemoVisibility();
  const requestRevisionRef = useRef(new RequestRevisionTracker());
  const isSubmittingRef = useRef(false);
  const notificationSequenceRef = useRef(0);
  const [sales, setSales] = useState<SaleHistoryItem[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [wasteRecords, setWasteRecords] = useState<RemoteWasteRecord[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleHistoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);
  const [notification, setNotification] = useState<SalesNotification | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDateRange, setActiveDateRange] = useState<ReportDateRange | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [buyerFilter, setBuyerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<WasteCategoryFilter>("all");
  const [saleSearch, setSaleSearch] = useState("");
  const [sortOption, setSortOption] = useState<SalesSortOption>("newest");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyLoadResults = useCallback((
    salesResult: SalesListResult,
    formDataResult: SaleFormDataResult,
    requestRevision: number,
  ): boolean => {
    if (!requestRevisionRef.current.isCurrent(requestRevision)) return false;

    if (!salesResult.ok) {
      setSales([]);
      setBuyers([]);
      setWasteRecords([]);
      setContainers([]);
      setLoadError(getSalesErrorKey(salesResult.error.code));
      setIsLoading(false);
      return false;
    }

    if (!formDataResult.ok) {
      setSales([]);
      setBuyers([]);
      setWasteRecords([]);
      setContainers([]);
      setLoadError(getSalesErrorKey(formDataResult.error.code));
      setIsLoading(false);
      return false;
    }

    setSales(salesResult.data);
    setBuyers(formDataResult.data.buyers);
    setWasteRecords(formDataResult.data.wasteRecords);
    setContainers(formDataResult.data.containers);
    setLoadError(null);
    setIsLoading(false);
    return true;
  }, []);

  const loadSalesData = useCallback(async (
    dateRange?: TimestampRange,
    buyerId?: string,
  ): Promise<void> => {
    const requestRevision = requestRevisionRef.current.issue();
    setIsLoading(true);
    setLoadError(null);

    const { salesResult, formDataResult } = await fetchSalesPageData(dateRange, buyerId);
    applyLoadResults(salesResult, formDataResult, requestRevision);
  }, [applyLoadResults]);

  useEffect(() => {
    const requestTracker = requestRevisionRef.current;
    const requestRevision = requestTracker.issue();

    void fetchSalesPageData().then(({ salesResult, formDataResult }) => {
      applyLoadResults(salesResult, formDataResult, requestRevision);
    });

    return () => {
      requestTracker.invalidate();
    };
  }, [applyLoadResults, userId]);

  const closeNotification = useCallback(() => setNotification(null), []);
  const showNotification = useCallback((
    variant: SalesNotification["variant"],
    titleKey: string,
    descriptionKey: string,
  ): void => {
    notificationSequenceRef.current += 1;
    setNotification({
      id: notificationSequenceRef.current,
      variant,
      titleKey,
      descriptionKey,
    });
  }, []);

  const activeTimestampRange = activeDateRange === null
    ? undefined
    : toTimestampRange(activeDateRange);

  const handleCreateSale = async (values: SaleRegistrationValues): Promise<void> => {
    if (isSubmittingRef.current) return;

    const selectedBuyer = buyers.find((buyer) => buyer.id === values.buyerId);
    const selectedWasteRecord = wasteRecords.find((record) => record.id === values.wasteRecordId);
    if (!selectedBuyer || !selectedWasteRecord) {
      showNotification("error", "sales.createErrorTitle", "sales.selectionChanged");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setNotification(null);
    const lifecycleRevision = requestRevisionRef.current.issue();

    try {
      const result = await createSale(values);
      if (!requestRevisionRef.current.isCurrent(lifecycleRevision)) return;

      if (result.ok) {
        const historyItem: SaleHistoryItem = {
          ...result.data,
          buyerName: selectedBuyer.name,
          wasteRecordNumber: selectedWasteRecord.recordNumber,
          category: selectedWasteRecord.category,
        };
        if (filterSalesHistory(
          [historyItem],
          activeTimestampRange,
          buyerFilter || undefined,
          categoryFilter,
        ).length === 1) {
          setSales((current) => [historyItem, ...current.filter((sale) => sale.id !== historyItem.id)]);
        }
        setWasteRecords((current) => current.filter((record) => record.id !== values.wasteRecordId));
        setIsModalOpen(false);
        showNotification("success", "sales.createSuccessTitle", "sales.createSuccessDescription");
        return;
      }

      if (result.error.code === "confirmation_unknown") {
        const refreshedData = await fetchSalesPageData(activeTimestampRange, buyerFilter || undefined);
        if (!requestRevisionRef.current.isCurrent(lifecycleRevision)) return;

        const refreshed = applyLoadResults(
          refreshedData.salesResult,
          refreshedData.formDataResult,
          lifecycleRevision,
        );
        if (!refreshed || !refreshedData.salesResult.ok || !refreshedData.formDataResult.ok) {
          setIsModalOpen(false);
          showNotification("error", "sales.confirmationPendingTitle", "sales.confirmationUnknown");
          return;
        }

        let confirmedSale = refreshedData.salesResult.data.find(
          (sale) => sale.wasteRecordId === values.wasteRecordId,
        );
        if (!confirmedSale && (activeTimestampRange !== undefined || buyerFilter !== "")) {
          const completeSalesResult = await listSales();
          if (completeSalesResult.ok) {
            confirmedSale = completeSalesResult.data.find(
              (sale) => sale.wasteRecordId === values.wasteRecordId,
            );
          }
        }
        if (confirmedSale) {
          setIsModalOpen(false);
          showNotification("success", "sales.createSuccessTitle", "sales.confirmedAfterRefresh");
          return;
        }

        const wasteStillAvailable = refreshedData.formDataResult.data.wasteRecords.some(
          (record) => record.id === values.wasteRecordId,
        );
        if (wasteStillAvailable) {
          showNotification("error", "sales.createErrorTitle", "sales.notConfirmedAfterRefresh");
          return;
        }

        setLoadError("sales.confirmationUnknown");
        setIsModalOpen(false);
        showNotification("error", "sales.confirmationPendingTitle", "sales.confirmationUnknown");
        return;
      }

      if (result.error.code === "waste_not_available") {
        const refreshedData = await fetchSalesPageData(activeTimestampRange, buyerFilter || undefined);
        if (!requestRevisionRef.current.isCurrent(lifecycleRevision)) return;

        applyLoadResults(
          refreshedData.salesResult,
          refreshedData.formDataResult,
          lifecycleRevision,
        );
        setIsModalOpen(false);
      }

      showNotification("error", "sales.createErrorTitle", getSalesErrorKey(result.error.code));
    } catch {
      if (requestRevisionRef.current.isCurrent(lifecycleRevision)) {
        setLoadError("sales.confirmationUnknown");
        setIsModalOpen(false);
        showNotification("error", "sales.confirmationPendingTitle", "sales.confirmationUnknown");
      }
    } finally {
      isSubmittingRef.current = false;
      if (requestRevisionRef.current.isCurrent(lifecycleRevision)) setIsSubmitting(false);
    }
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const weightFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const amountRangeResult = parseSalesAmountRange(minimumAmount, maximumAmount);
  const salesMatchingTextFilters = filterSalesHistory(sales, undefined, undefined, categoryFilter, saleSearch);
  const visibleSales = amountRangeResult.valid
    ? filterSalesByAmount(salesMatchingTextFilters, amountRangeResult.range)
    : [];
  const totalRevenue = sumSafeMonetaryValues(visibleSales.map((sale) => sale.totalValue));
  const averageSellingPrice = calculateAverageSellingPricePerKg(visibleSales);
  const categorySummary = summarizeSalesByCategory(visibleSales);
  const totalWeight = visibleSales.reduce((total, sale) => total + sale.weightKg, 0);
  const servedBuyers = new Set(visibleSales.map((sale) => sale.buyerId)).size;
  const metricsUnavailable = isLoading || loadError !== null || !amountRangeResult.valid;
  const registrationUnavailable = isLoading || loadError !== null || buyers.length === 0 || wasteRecords.length === 0;
  const exportUnavailable = metricsUnavailable || visibleSales.length === 0 || exportKind !== null;
  const isAmountFiltered = minimumAmount.trim() !== "" || maximumAmount.trim() !== "";
  const activeAdvancedCount =
    (buyerFilter !== "" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (activeDateRange !== null ? 1 : 0) +
    (isAmountFiltered ? 1 : 0);
  const hasActiveFilters = saleSearch.trim() !== "" || activeAdvancedCount > 0;
  const isFiltered = hasActiveFilters;
  const emptyState = getSalesEmptyState(
    buyerFilter !== "",
    activeDateRange !== null,
  );
  const metricBadge = t(isFiltered ? "sales.filteredData" : "sales.realData");
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const sortedSales = sortSalesHistory(visibleSales, sortOption);
  const formatInputDate = (value: string): string =>
    dateFormatter.format(new Date(`${value}T00:00:00`));

  const handleApplyDateRange = (nextStart: string, nextEnd: string): boolean => {
    const nextRange = { startDate: nextStart, endDate: nextEnd };

    if (!isValidReportDateRange(nextRange)) {
      setDateRangeError("sales.invalidDateRange");
      return false;
    }

    setDateRangeError(null);
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setActiveDateRange(nextRange);
    void loadSalesData(toTimestampRange(nextRange), buyerFilter || undefined);
    return true;
  };

  const handleClearDateRange = (): void => {
    setStartDate("");
    setEndDate("");
    setDateRangeError(null);
    setActiveDateRange(null);
    void loadSalesData(undefined, buyerFilter || undefined);
  };

  const clearFilters = (): void => {
    setStartDate("");
    setEndDate("");
    setDateRangeError(null);
    setActiveDateRange(null);
    setBuyerFilter("");
    setCategoryFilter("all");
    setSaleSearch("");
    setMinimumAmount("");
    setMaximumAmount("");
    void loadSalesData();
  };

  const applyBuyerFilter = (buyerId: string): void => {
    setBuyerFilter(buyerId);
    void loadSalesData(activeTimestampRange, buyerId || undefined);
  };

  const handleExportSales = async (): Promise<void> => {
    if (exportUnavailable) return;

    setExportKind("csv");
    setNotification(null);
    const labels: SalesCsvLabels = {
      reference: t("sales.csv.reference"),
      completedAt: t("sales.csv.completedAt"),
      category: t("sales.csv.category"),
      weightKg: t("sales.csv.weightKg"),
      unitPriceCop: t("sales.csv.unitPriceCop"),
      totalValueCop: t("sales.csv.totalValueCop"),
      categories: getCsvCategoryLabels(t),
    };

    try {
      const result = await exportSalesHistory(
        labels,
        activeDateRange === null
          ? `ecoplaza-sales-${new Date().toISOString().slice(0, 10)}.csv`
          : `ecoplaza-sales-${activeDateRange.startDate}-${activeDateRange.endDate}.csv`,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        activeTimestampRange,
        buyerFilter || undefined,
        categoryFilter,
        sortOption,
        saleSearch,
        amountRangeResult.range,
      );

      if (result.ok) {
        if (result.status === "saved") {
          showNotification("success", "sales.exportSuccessTitle", "sales.exportSuccessDescription");
        }
        return;
      }

      showNotification(
        "error",
        "sales.exportErrorTitle",
        result.error === "file_error"
          ? "sales.exportFileError"
          : getSalesErrorKey(result.error),
      );
    } catch {
      showNotification("error", "sales.exportErrorTitle", "sales.exportFileError");
    } finally {
      setExportKind(null);
    }
  };

  const handleExportSalesExcel = async (): Promise<void> => {
    if (exportUnavailable) return;

    setExportKind("excel");
    setNotification(null);
    const labels: SalesExcelLabels = {
      workbookTitle: t("sales.excel.workbookTitle"),
      sheetName: t("sales.excel.sheetName"),
      saleId: t("sales.csv.reference"),
      buyer: t("buyers.buyer"),
      date: t("sales.csv.completedAt"),
      category: t("sales.csv.category"),
      weightKg: t("sales.csv.weightKg"),
      unitPriceCop: t("sales.csv.unitPriceCop"),
      totalValueCop: t("sales.csv.totalValueCop"),
      categories: getCsvCategoryLabels(t),
    };

    try {
      const result = await exportSalesExcel(
        labels,
        activeDateRange === null
          ? `ecoplaza-sales-${new Date().toISOString().slice(0, 10)}.xlsx`
          : `ecoplaza-sales-${activeDateRange.startDate}-${activeDateRange.endDate}.xlsx`,
        activeTimestampRange,
        buyerFilter || undefined,
        categoryFilter,
        sortOption,
        saleSearch,
        amountRangeResult.range,
      );
      if (result.ok) {
        if (result.status === "saved") {
          showNotification("success", "sales.excelExportSuccessTitle", "sales.excelExportSuccessDescription");
        }
        return;
      }
      showNotification(
        "error",
        "sales.exportErrorTitle",
        result.error === "file_error" ? "sales.exportFileError" : getSalesErrorKey(result.error),
      );
    } catch {
      showNotification("error", "sales.exportErrorTitle", "sales.exportFileError");
    } finally {
      setExportKind(null);
    }
  };

  return (
    <section className="p-8">
      <PageHeader eyebrow={t("sales.eyebrow")} title={t("sales.title")} description={t("sales.description")} />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title={t("sales.completedSales")} value={metricsUnavailable ? "—" : String(visibleSales.length)} description={t("sales.operations")} badge={metricBadge} />
        <MetricCard title={t("dashboard.revenue")} value={metricsUnavailable || totalRevenue === null ? "—" : currencyFormatter.format(totalRevenue)} description={t("sales.realRevenueDescription")} badge={metricBadge} />
        <MetricCard title={t("sales.soldMaterial")} value={metricsUnavailable ? "—" : `${weightFormatter.format(totalWeight)} ${t("common.kg")}`} description={t("sales.quantitySold")} badge={metricBadge} />
        <MetricCard title={t("sales.servedBuyers")} value={metricsUnavailable ? "—" : String(servedBuyers)} description={t("sales.buyersWithSales")} badge={metricBadge} />
        <MetricCard title={t("sales.averagePrice")} value={metricsUnavailable || averageSellingPrice === null ? "—" : currencyFormatter.format(averageSellingPrice)} description={t("sales.averagePriceDescription")} badge={metricBadge} />
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ecoplaza-text">{t("sales.records")}</h2>
              <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{metricBadge}</span>
            </div>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.realRecordsDescription")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={exportUnavailable}
              onClick={() => void handleExportSales()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-border px-4 py-3 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "csv" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "csv" ? t("sales.exporting") : t("sales.exportCsv")}
            </button>
            <button
              type="button"
              disabled={exportUnavailable}
              onClick={() => void handleExportSalesExcel()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-border px-4 py-3 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "excel" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "excel" ? t("sales.exportingExcel") : t("sales.exportExcel")}
            </button>
            <button
              type="button"
              disabled={registrationUnavailable}
              onClick={() => { setNotification(null); setIsModalOpen(true); }}
              className="rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              + {t("sales.registerButton")}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-0 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-sm">
          {/* ZONA PRIMARIA (Siempre visible) */}
          <div className="flex flex-col md:flex-row gap-3 items-center p-4">
            {/* Buscador por ID/Comprador (flex-1) */}
            <label className="relative min-w-[250px] flex-1">
              <span className="sr-only">{t("sales.saleSearchLabel")}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ecoplaza-text-muted"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={saleSearch}
                disabled={isLoading || loadError !== null}
                onChange={(event) => setSaleSearch(event.target.value)}
                placeholder={t("sales.saleSearchPlaceholder")}
                aria-label={t("sales.saleSearchLabel")}
                className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background pl-10 pr-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              />
              {saleSearch.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setSaleSearch("")}
                  aria-label={t("sales.clearSearch")}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ecoplaza-text-muted hover:bg-ecoplaza-surface hover:text-ecoplaza-text"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>

            {/* Botón Filtros avanzados */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={showAdvanced}
              aria-label={t("sales.advancedFilters")}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-ecoplaza-border bg-transparent px-3.5 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            >
              <SlidersHorizontal size={16} className="text-ecoplaza-text-muted" aria-hidden="true" />
              <span>{t("sales.advancedFilters")}</span>
              {activeAdvancedCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ecoplaza-primary px-1 text-[11px] font-bold text-white">
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown
                size={16}
                className={`text-ecoplaza-text-muted transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {/* Botón Limpiar (solo visible si hasActiveFilters es true) */}
            {hasActiveFilters && (
              <button
                type="button"
                disabled={isLoading}
                onClick={clearFilters}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ecoplaza-border/60 bg-transparent px-3.5 text-sm font-medium text-ecoplaza-danger transition-colors hover:border-ecoplaza-danger/40 hover:bg-ecoplaza-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={15} aria-hidden="true" />
                <span>{t("sales.clearFilters")}</span>
              </button>
            )}
          </div>

          {/* ZONA AVANZADA (Divulgación progresiva) */}
          {showAdvanced && (
            <div className="rounded-b-2xl border-t border-ecoplaza-border bg-ecoplaza-background/50 p-4 transition-all duration-300 ease-in-out">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {/* 1. Selector de Comprador */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("sales.buyerFilter")}
                  </span>
                  <select
                    value={buyerFilter}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => applyBuyerFilter(event.target.value)}
                    aria-label={t("sales.buyerFilter")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="">{t("sales.allBuyers")}</option>
                    {buyers.map((buyer) => (
                      <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
                    ))}
                  </select>
                </label>

                {/* 2. Selector de Categoría */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("sales.categoryFilter")}
                  </span>
                  <select
                    value={categoryFilter}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => setCategoryFilter(event.target.value as WasteCategoryFilter)}
                    aria-label={t("sales.categoryFilter")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="all">{t("sales.allCategories")}</option>
                    <option value="organic">{t("common.organic")}</option>
                    <option value="recyclable">{t("common.recyclable")}</option>
                    <option value="nonRecyclable">{t("common.nonRecyclable")}</option>
                  </select>
                </label>

                {/* 3. Fechas: DateRangePickerButton */}
                <div className="relative flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("sales.dateRange")}
                  </span>
                  <DateRangePickerButton
                    startDate={startDate}
                    endDate={endDate}
                    activeRange={activeDateRange}
                    error={dateRangeError !== null}
                    disabled={isLoading || loadError !== null}
                    namespace="sales"
                    onApply={handleApplyDateRange}
                    onClear={handleClearDateRange}
                  />
                </div>

                {/* 4. Rango de Valor (COP): Agrupa Valor mínimo y Valor máximo en un solo bloque compacto */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("sales.amountRange")}
                  </span>
                  <div className="flex h-10 w-full items-center gap-2 overflow-hidden rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 focus-within:border-ecoplaza-primary">
                    <label className="flex flex-1 min-w-0 items-center gap-1.5 text-xs text-ecoplaza-text-muted">
                      <span className="sr-only">{t("sales.minimumAmount")}</span>
                      <span className="shrink-0" aria-hidden="true">{t("sales.minAmount")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={minimumAmount}
                        disabled={isLoading || loadError !== null}
                        onChange={(event) => setMinimumAmount(event.target.value)}
                        placeholder="0"
                        aria-label={t("sales.minimumAmount")}
                        className="flex-1 min-w-0 bg-transparent text-sm text-ecoplaza-text outline-none placeholder:text-ecoplaza-text-muted/60"
                      />
                    </label>
                    <span className="shrink-0 text-ecoplaza-text-muted" aria-hidden="true">—</span>
                    <label className="flex flex-1 min-w-0 items-center gap-1.5 text-xs text-ecoplaza-text-muted">
                      <span className="sr-only">{t("sales.maximumAmount")}</span>
                      <span className="shrink-0" aria-hidden="true">{t("sales.maxAmount")}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={maximumAmount}
                        disabled={isLoading || loadError !== null}
                        onChange={(event) => setMaximumAmount(event.target.value)}
                        placeholder="∞"
                        aria-label={t("sales.maximumAmount")}
                        className="flex-1 min-w-0 bg-transparent text-sm text-ecoplaza-text outline-none placeholder:text-ecoplaza-text-muted/60"
                      />
                    </label>
                  </div>
                </div>

                {/* 5. Selector Ordenar por */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("sales.sortBy")}
                  </span>
                  <select
                    value={sortOption}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => setSortOption(event.target.value as SalesSortOption)}
                    aria-label={t("sales.sortBy")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="newest">{t("sales.sortNewest")}</option>
                    <option value="oldest">{t("sales.sortOldest")}</option>
                    <option value="valueDesc">{t("sales.sortValueDesc")}</option>
                    <option value="valueAsc">{t("sales.sortValueAsc")}</option>
                  </select>
                </label>
              </div>

              {dateRangeError !== null && (
                <p role="alert" className="mt-3 text-xs text-ecoplaza-danger">
                  {t(dateRangeError)}
                </p>
              )}
              {activeDateRange !== null && (
                <p className="mt-2 text-xs font-medium text-ecoplaza-primary">
                  {t("sales.activeDateRange", {
                    start: formatInputDate(activeDateRange.startDate),
                    end: formatInputDate(activeDateRange.endDate),
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {!isLoading && !loadError && (buyers.length === 0 || wasteRecords.length === 0) && (
          <div className="mt-4 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted">
            {t(buyers.length === 0 ? "sales.noBuyers" : "sales.noAvailableWaste")}
          </div>
        )}

        {!metricsUnavailable && visibleSales.length > 0 && (
          <section className="mt-4 rounded-2xl border border-ecoplaza-primary/20 bg-ecoplaza-primary/5 p-4" aria-labelledby="sales-category-summary-title">
            <div>
              <h3 id="sales-category-summary-title" className="text-sm font-semibold text-ecoplaza-text">{t("sales.categorySummaryTitle")}</h3>
              <p className="mt-1 text-xs text-ecoplaza-text-muted">{t("sales.categorySummaryDescription")}</p>
            </div>
            {categorySummary === null ? (
              <p role="alert" className="mt-3 text-sm text-ecoplaza-danger">{t("sales.categorySummaryError")}</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {categorySummary.map((summary) => (
                  <article key={summary.category} className="rounded-xl bg-ecoplaza-surface/80 p-3">
                    <h4 className="text-xs font-semibold text-ecoplaza-text">{t(`common.${summary.category}`)}</h4>
                    <dl className="mt-2 grid grid-cols-3 gap-2">
                      <div><dt className="text-[10px] text-ecoplaza-text-muted">{t("sales.summarySales")}</dt><dd className="mt-1 text-sm font-semibold text-ecoplaza-text">{summary.saleCount}</dd></div>
                      <div><dt className="text-[10px] text-ecoplaza-text-muted">{t("sales.summaryWeight")}</dt><dd className="mt-1 text-sm font-semibold text-ecoplaza-text">{weightFormatter.format(summary.totalWeightKg)} {t("common.kg")}</dd></div>
                      <div><dt className="text-[10px] text-ecoplaza-text-muted">{t("sales.summaryRevenue")}</dt><dd className="mt-1 text-sm font-semibold text-ecoplaza-primary">{currencyFormatter.format(summary.grossRevenue)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("sales.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button type="button" onClick={() => void loadSalesData(activeTimestampRange, buyerFilter || undefined)} className="mt-4 flex items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary">
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("sales.retry")}
              </button>
            </div>
          ) : !amountRangeResult.valid ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <AlertTriangle size={24} strokeWidth={1.8} className="text-ecoplaza-danger" aria-hidden="true" />
              <p className="mt-3 text-sm text-ecoplaza-text-muted">{t("sales.invalidAmountRange")}</p>
            </div>
          ) : visibleSales.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t(saleSearch.trim() !== "" ? "sales.emptySearchTitle" : categoryFilter === "all" ? emptyState.titleKey : "sales.emptyCategoryTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t(saleSearch.trim() !== "" ? "sales.emptySearchDescription" : categoryFilter === "all" ? emptyState.descriptionKey : "sales.emptyCategoryDescription")}</p>
            </div>
          ) : (
            <SalesTable sales={sortedSales} onViewDetails={setSelectedSale} />
          )}
        </div>
      </div>

      {showDemoData && (
        <div className="mt-10 border-t border-ecoplaza-border pt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("sales.demoTitle")}</h2>
            <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">{t("sales.demoData")}</span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.demoDescription")}</p>
          <div className="mt-4"><DemoSalesTable sales={demoSales} /></div>
        </div>
      )}

      {isModalOpen && (
        <SaleRegistrationModal
          buyers={buyers}
          wasteRecords={wasteRecords}
          containers={containers}
          isSubmitting={isSubmitting}
          onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
          onSubmit={(values) => void handleCreateSale(values)}
        />
      )}

      {selectedSale && (
        <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      {notification && (
        <SuccessToast
          key={notification.id}
          title={t(notification.titleKey)}
          description={t(notification.descriptionKey)}
          closeLabel={t("sales.dismissNotification")}
          onClose={closeNotification}
          duration={notification.variant === "error" ? 8000 : undefined}
          variant={notification.variant}
        />
      )}
    </section>
  );
}

function SalesPage() {
  const { user } = useAuth();
  return user ? <UserSalesPage key={user.id} userId={user.id} /> : null;
}

export default SalesPage;
