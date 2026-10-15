import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarRange, Database, Download, LoaderCircle, RefreshCw } from "lucide-react";
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
} from "../services/coreWorkflow";
import {
  MAX_MONETARY_FRACTION_DIGITS,
  sumSafeMonetaryValues,
} from "../services/monetarySafety";
import { getSalesEmptyState } from "../services/salesEmptyState";

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
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<SalesNotification | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDateRange, setActiveDateRange] = useState<ReportDateRange | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [buyerFilter, setBuyerFilter] = useState("");
  const [sortOption, setSortOption] = useState<SalesSortOption>("newest");

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
  const totalRevenue = sumSafeMonetaryValues(sales.map((sale) => sale.totalValue));
  const totalWeight = sales.reduce((total, sale) => total + sale.weightKg, 0);
  const servedBuyers = new Set(sales.map((sale) => sale.buyerId)).size;
  const metricsUnavailable = isLoading || loadError !== null;
  const registrationUnavailable = metricsUnavailable || buyers.length === 0 || wasteRecords.length === 0;
  const exportUnavailable = metricsUnavailable || sales.length === 0 || isExporting;
  const isFiltered = activeDateRange !== null || buyerFilter !== "";
  const emptyState = getSalesEmptyState(
    buyerFilter !== "",
    activeDateRange !== null,
  );
  const metricBadge = t(isFiltered ? "sales.filteredData" : "sales.realData");
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const sortedSales = sortSalesHistory(sales, sortOption);
  const formatInputDate = (value: string): string =>
    dateFormatter.format(new Date(`${value}T00:00:00`));

  const applyDateRange = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextRange = { startDate, endDate };

    if (!isValidReportDateRange(nextRange)) {
      setDateRangeError("sales.invalidDateRange");
      return;
    }

    setDateRangeError(null);
    setActiveDateRange(nextRange);
    void loadSalesData(toTimestampRange(nextRange), buyerFilter || undefined);
  };

  const clearFilters = (): void => {
    setStartDate("");
    setEndDate("");
    setDateRangeError(null);
    setActiveDateRange(null);
    setBuyerFilter("");
    void loadSalesData();
  };

  const applyBuyerFilter = (buyerId: string): void => {
    setBuyerFilter(buyerId);
    void loadSalesData(activeTimestampRange, buyerId || undefined);
  };

  const handleExportSales = async (): Promise<void> => {
    if (exportUnavailable) return;

    setIsExporting(true);
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
        sortOption,
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
      setIsExporting(false);
    }
  };

  return (
    <section className="p-8">
      <PageHeader eyebrow={t("sales.eyebrow")} title={t("sales.title")} description={t("sales.description")} />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard title={t("sales.completedSales")} value={metricsUnavailable ? "—" : String(sales.length)} description={t("sales.operations")} badge={metricBadge} />
        <MetricCard title={t("dashboard.revenue")} value={metricsUnavailable || totalRevenue === null ? "—" : currencyFormatter.format(totalRevenue)} description={t("sales.realRevenueDescription")} badge={metricBadge} />
        <MetricCard title={t("sales.soldMaterial")} value={metricsUnavailable ? "—" : `${weightFormatter.format(totalWeight)} ${t("common.kg")}`} description={t("sales.quantitySold")} badge={metricBadge} />
        <MetricCard title={t("sales.servedBuyers")} value={metricsUnavailable ? "—" : String(servedBuyers)} description={t("sales.buyersWithSales")} badge={metricBadge} />
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
              {isExporting ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {isExporting ? t("sales.exporting") : t("sales.exportCsv")}
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

        <form onSubmit={applyDateRange} className="mt-5 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
          <div className="flex items-start gap-3">
            <CalendarRange className="mt-0.5 text-ecoplaza-primary" size={20} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-ecoplaza-text">{t("sales.dateRange")}</h3>
              <p className="mt-1 text-xs text-ecoplaza-text-muted">{t("sales.dateRangeDescription")}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] xl:items-end">
            <label className="text-xs font-medium text-ecoplaza-text-muted">
              {t("sales.buyerFilter")}
              <select value={buyerFilter} disabled={isLoading} onChange={(event) => applyBuyerFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text">
                <option value="">{t("sales.allBuyers")}</option>
                {buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyer.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ecoplaza-text-muted">
              {t("sales.sortBy")}
              <select
                value={sortOption}
                disabled={isLoading}
                onChange={(event) => setSortOption(event.target.value as SalesSortOption)}
                className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text"
              >
                <option value="newest">{t("sales.sortNewest")}</option>
                <option value="oldest">{t("sales.sortOldest")}</option>
                <option value="valueDesc">{t("sales.sortValueDesc")}</option>
                <option value="valueAsc">{t("sales.sortValueAsc")}</option>
              </select>
            </label>
            <label className="text-xs font-medium text-ecoplaza-text-muted">
              {t("sales.startDate")}
              <input type="date" value={startDate} max={endDate || undefined} required disabled={isLoading} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text" />
            </label>
            <label className="text-xs font-medium text-ecoplaza-text-muted">
              {t("sales.endDate")}
              <input type="date" value={endDate} min={startDate || undefined} required disabled={isLoading} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 py-2 text-sm text-ecoplaza-text" />
            </label>
            <button type="submit" disabled={isLoading} className="rounded-lg bg-ecoplaza-secondary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {t("sales.applyDateRange")}
            </button>
            <button type="button" disabled={isLoading || (!isFiltered && startDate === "" && endDate === "")} onClick={clearFilters} className="rounded-lg border border-ecoplaza-border px-4 py-2 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-50">
              {t("sales.clearFilters")}
            </button>
          </div>
          {dateRangeError !== null && <p role="alert" className="mt-3 text-sm text-ecoplaza-danger">{t(dateRangeError)}</p>}
          {activeDateRange !== null && (
            <p className="mt-3 text-sm font-medium text-ecoplaza-primary">
              {t("sales.activeDateRange", { start: formatInputDate(activeDateRange.startDate), end: formatInputDate(activeDateRange.endDate) })}
            </p>
          )}
        </form>

        {!isLoading && !loadError && (buyers.length === 0 || wasteRecords.length === 0) && (
          <div className="mt-4 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted">
            {t(buyers.length === 0 ? "sales.noBuyers" : "sales.noAvailableWaste")}
          </div>
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
          ) : sales.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t(emptyState.titleKey)}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t(emptyState.descriptionKey)}</p>
            </div>
          ) : (
            <SalesTable sales={sortedSales} onViewDetails={setSelectedSale} />
          )}
        </div>
      </div>

      <div className="mt-10 border-t border-ecoplaza-border pt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ecoplaza-text">{t("sales.demoTitle")}</h2>
          <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">{t("sales.demoData")}</span>
        </div>
        <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.demoDescription")}</p>
        <div className="mt-4"><DemoSalesTable sales={demoSales} /></div>
      </div>

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
