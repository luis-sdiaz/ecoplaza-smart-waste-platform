import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Database,
  Download,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SuccessToast from "../components/SuccessToast";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import WasteRecordTable, { type WasteRecord } from "../components/WasteRecordTable";
import WasteRegistrationModal, {
  type WasteRegistrationValues,
} from "../components/WasteRegistrationModal";
import DateRangePickerButton from "../components/common/DateRangePickerButton";
import { formatColombianDate } from "../services/colombianDate";
import {
  listContainers,
  type Container,
  type ContainerErrorCode,
} from "../services/containerService";
import {
  calculateWasteStatistics,
  createWasteRecord,
  listWasteRecords,
  type RemoteWasteRecord,
  type WasteCategory,
  type WasteErrorCode,
  type WasteStatus,
} from "../services/wasteService";
import {
  filterWasteHistory,
  sortWasteHistory,
  summarizeFilteredWaste,
  type WasteSortOption,
} from "../services/coreWorkflow";
import { saveWasteCsv, type WasteCsvLabels } from "../services/wasteCsv";
import { getCsvCategoryLabels } from "../services/csvCategoryLabels";
import {
  isValidReportDateRange,
  toTimestampRange,
  type ReportDateRange,
} from "../services/reportDateRange";
import { saveWasteExcel, type WasteExcelLabels } from "../services/wasteExcelService";

const WASTE_RECORDS_STORAGE_PREFIX = "ecoplaza-waste-records:";

type WasteRegistrationNotification = {
  id: number;
  variant: "success" | "error";
  titleKey: string;
  descriptionKey: string;
};

type WasteListResult = Awaited<ReturnType<typeof listWasteRecords>>;
type ContainerListResult = Awaited<ReturnType<typeof listContainers>>;

const baseWasteRecords: WasteRecord[] = [
  { id: "RES-001", category: "Orgánicos", weight: "18.4 kg", container: "Contenedor 01", date: "03/10/2026", status: "Disponible" },
  { id: "RES-002", category: "Reciclables", weight: "12.7 kg", container: "Contenedor 02", date: "03/10/2026", status: "Disponible" },
  { id: "RES-003", category: "No aprovechables", weight: "23.1 kg", container: "Contenedor 03", date: "02/10/2026", status: "Registrado" },
  { id: "RES-004", category: "Orgánicos", weight: "15.8 kg", container: "Contenedor 01", date: "02/10/2026", status: "Disponible" },
];

function getWasteRecordsStorageKey(userId: string): string {
  return `${WASTE_RECORDS_STORAGE_PREFIX}${userId}`;
}

function readSavedWasteRecords(userId: string): WasteRecord[] {
  try {
    const storedRecords = localStorage.getItem(getWasteRecordsStorageKey(userId));
    if (!storedRecords) return [];

    const parsedRecords: unknown = JSON.parse(storedRecords);
    if (!Array.isArray(parsedRecords)) return [];

    return parsedRecords.filter(
      (record): record is WasteRecord =>
        typeof record === "object" &&
        record !== null &&
        typeof record.id === "string" &&
        typeof record.category === "string" &&
        typeof record.weight === "number" &&
        Number.isFinite(record.weight) &&
        record.weight > 0 &&
        typeof record.container === "string" &&
        typeof record.date === "string" &&
        record.status === "available",
    );
  } catch {
    return [];
  }
}

function getWasteErrorKey(code: WasteErrorCode): string {
  if (code === "unauthorized") return "waste.unauthorized";
  if (code === "invalid_container" || code === "container_not_found") return "waste.containerNotFound";
  if (code === "invalid_category") return "waste.selectCategory";
  if (code === "invalid_weight") return "waste.invalidWeight";
  if (code === "network_error") return "waste.networkError";
  if (code === "permission_denied") return "waste.permissionError";
  if (code === "constraint_violation") return "waste.constraintError";
  return "waste.databaseError";
}

function getContainerLoadErrorKey(code: ContainerErrorCode): string {
  if (code === "unauthorized") return "waste.unauthorized";
  if (code === "network_error") return "waste.networkError";
  if (code === "permission_denied") return "waste.permissionError";
  return "waste.databaseError";
}

function UserWastePage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const { showDemoData } = useDemoVisibility();
  const [legacyRecords] = useState<WasteRecord[]>(() => [
    ...baseWasteRecords,
    ...readSavedWasteRecords(userId),
  ]);
  const [remoteRecords, setRemoteRecords] = useState<RemoteWasteRecord[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WasteStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<WasteCategory | "all">("all");
  const [containerFilter, setContainerFilter] = useState("all");
  const [recordSearch, setRecordSearch] = useState("");
  const [sortOption, setSortOption] = useState<WasteSortOption>("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDateRange, setActiveDateRange] = useState<ReportDateRange | null>(null);
  const [dateRangeError, setDateRangeError] = useState(false);
  const [notification, setNotification] = useState<WasteRegistrationNotification | null>(null);
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);
  const requestRevisionRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const notificationSequenceRef = useRef(0);

  const applyLoadResults = useCallback((
    wasteResult: WasteListResult,
    containersResult: ContainerListResult,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!wasteResult.ok) {
      setRemoteRecords([]);
      setContainers(containersResult.ok ? containersResult.data : []);
      setLoadError(getWasteErrorKey(wasteResult.error.code));
      setIsLoading(false);
      return;
    }

    if (!containersResult.ok) {
      setRemoteRecords(wasteResult.data);
      setContainers([]);
      setLoadError(getContainerLoadErrorKey(containersResult.error.code));
      setIsLoading(false);
      return;
    }

    setRemoteRecords(wasteResult.data);
    setContainers(containersResult.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadRemoteData = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);
    const [wasteResult, containersResult] = await Promise.all([
      listWasteRecords(),
      listContainers(),
    ]);
    applyLoadResults(wasteResult, containersResult, requestRevision);
  }, [applyLoadResults]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void Promise.all([listWasteRecords(), listContainers()]).then(
      ([wasteResult, containersResult]) => {
        applyLoadResults(wasteResult, containersResult, requestRevision);
      },
    );

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyLoadResults]);

  const showNotification = (
    variant: WasteRegistrationNotification["variant"],
    titleKey: string,
    descriptionKey: string,
  ): void => {
    notificationSequenceRef.current += 1;
    setNotification({ id: notificationSequenceRef.current, variant, titleKey, descriptionKey });
  };

  const closeNotification = useCallback((): void => {
    setNotification(null);
  }, []);

  const handleRegisterWaste = async (values: WasteRegistrationValues): Promise<void> => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setNotification(null);
    const lifecycleRevision = requestRevisionRef.current;

    try {
      const result = await createWasteRecord({
        category: values.category,
        containerId: values.containerId,
        weightKg: values.weight,
      });
      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (!result.ok) {
        showNotification("error", "waste.registerErrorTitle", getWasteErrorKey(result.error.code));
        return;
      }

      const [wasteResult, containersResult] = await Promise.all([
        listWasteRecords(),
        listContainers(),
      ]);
      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (wasteResult.ok) {
        setRemoteRecords(wasteResult.data);
      } else {
        setRemoteRecords((current) =>
          current.some((record) => record.id === result.data.id)
            ? current
            : [result.data, ...current],
        );
      }
      if (containersResult.ok) setContainers(containersResult.data);

      setIsModalOpen(false);
      showNotification("success", "waste.registerSuccessTitle", "waste.registerSuccessDescription");
    } catch {
      if (lifecycleRevision === requestRevisionRef.current) {
        showNotification("error", "waste.registerErrorTitle", "waste.databaseError");
      }
    } finally {
      isSubmittingRef.current = false;
      if (lifecycleRevision === requestRevisionRef.current) setIsSubmitting(false);
    }
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const containerCodes = new Map(containers.map((container) => [container.id, container.code]));
  const timestampRange = activeDateRange === null ? undefined : toTimestampRange(activeDateRange);
  const filteredRemoteRecords = filterWasteHistory(
    remoteRecords,
    statusFilter,
    categoryFilter,
    containerFilter,
    timestampRange,
    recordSearch,
  );
  const visibleRemoteRecords = sortWasteHistory(filteredRemoteRecords, sortOption);
  const filteredSummary = summarizeFilteredWaste(visibleRemoteRecords);
  const hasActiveFilters =
    recordSearch.trim() !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    containerFilter !== "all" ||
    activeDateRange !== null ||
    startDate !== "" ||
    endDate !== "";
  const activeAdvancedCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (containerFilter !== "all" ? 1 : 0) +
    (activeDateRange !== null || startDate !== "" || endDate !== "" ? 1 : 0);
  const tableRecords: WasteRecord[] = visibleRemoteRecords.map((record) => ({
    id: `RES-${record.recordNumber.padStart(3, "0")}`,
    category: record.category,
    weight: record.weightKg,
    container: containerCodes.get(record.containerId) ?? t("waste.unknownContainer"),
    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.registeredAt)),
    status: record.status,
  }));
  const statistics = calculateWasteStatistics(remoteRecords);
  const formatWeight = (value: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${t("common.kg")}`;
  const registrationUnavailable = isLoading || loadError !== null || containers.length === 0;
  const metricsUnavailable = isLoading || loadError !== null;

  const handleApplyDateRange = (start: string, end: string): boolean => {
    const nextRange = { startDate: start, endDate: end };
    if (!isValidReportDateRange(nextRange)) {
      setDateRangeError(true);
      return false;
    }
    setDateRangeError(false);
    setStartDate(start);
    setEndDate(end);
    setActiveDateRange(nextRange);
    return true;
  };

  const handleClearDateRange = (): void => {
    setStartDate("");
    setEndDate("");
    setActiveDateRange(null);
    setDateRangeError(false);
  };

  const clearHistoryFilters = (): void => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setContainerFilter("all");
    setRecordSearch("");
    setStartDate("");
    setEndDate("");
    setActiveDateRange(null);
    setDateRangeError(false);
  };

  const exportWasteHistory = async (): Promise<void> => {
    if (visibleRemoteRecords.length === 0 || exportKind !== null) return;
    setExportKind("csv");
    setNotification(null);
    const labels: WasteCsvLabels = {
      recordNumber: t("waste.csv.recordNumber"), id: t("waste.csv.id"),
      category: t("waste.csv.category"), weightKg: t("waste.csv.weightKg"),
      container: t("waste.csv.container"), registeredAt: t("waste.csv.registeredAt"),
      status: t("waste.csv.status"), categories: getCsvCategoryLabels(t),
      statuses: { registered: t("common.registered"), available: t("common.available"), sold: t("common.sold") },
    };
    try {
      const result = await saveWasteCsv(visibleRemoteRecords, containerCodes, labels,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        `ecoplaza-waste-${new Date().toISOString().slice(0, 10)}.csv`);
      if (result === "saved") showNotification("success", "waste.exportSuccessTitle", "waste.exportSuccessDescription");
    } catch {
      showNotification("error", "waste.exportErrorTitle", "waste.exportErrorDescription");
    } finally {
      setExportKind(null);
    }
  };

  const exportWasteHistoryExcel = async (): Promise<void> => {
    if (visibleRemoteRecords.length === 0 || exportKind !== null) return;
    setExportKind("excel");
    setNotification(null);
    const labels: WasteExcelLabels = {
      workbookTitle: t("waste.excel.workbookTitle"),
      sheetName: t("waste.excel.sheetName"),
      id: t("waste.excel.id"),
      recordNumber: t("waste.excel.recordNumber"),
      category: t("waste.excel.category"),
      weightKg: t("waste.excel.weightKg"),
      container: t("waste.excel.container"),
      registeredAt: t("waste.excel.registeredAt"),
      status: t("waste.excel.status"),
      categories: getCsvCategoryLabels(t),
      statuses: { registered: t("common.registered"), available: t("common.available"), sold: t("common.sold") },
    };
    try {
      const result = await saveWasteExcel(
        visibleRemoteRecords,
        containerCodes,
        labels,
        `ecoplaza-waste-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      if (result === "saved") {
        showNotification("success", "waste.excelExportSuccessTitle", "waste.excelExportSuccessDescription");
      }
    } catch {
      showNotification("error", "waste.exportErrorTitle", "waste.exportErrorDescription");
    } finally {
      setExportKind(null);
    }
  };

  return (
    <section className="p-8">
      <PageHeader eyebrow={t("waste.eyebrow")} title={t("waste.title")} description={t("waste.description")} />

      <div className="mt-8 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-ecoplaza-text">{t("waste.remoteRecords")}</h2>
        <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">
          {t("waste.remoteData")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4">
        <MetricCard title={t("waste.totalRegistered")} value={metricsUnavailable ? "—" : formatWeight(statistics.totalWeightKg)} description={t("waste.remoteAccumulatedWaste")} />
        <MetricCard title={t("common.organic")} value={metricsUnavailable ? "—" : formatWeight(statistics.organicWeightKg)} description={t("waste.percentageOfTotal", { percentage: Math.round(statistics.organicPercentage) })} />
        <MetricCard title={t("common.recyclable")} value={metricsUnavailable ? "—" : formatWeight(statistics.recyclableWeightKg)} description={t("waste.percentageOfTotal", { percentage: Math.round(statistics.recyclablePercentage) })} />
        <MetricCard title={t("common.nonRecyclable")} value={metricsUnavailable ? "—" : formatWeight(statistics.nonRecyclableWeightKg)} description={t("waste.percentageOfTotal", { percentage: Math.round(statistics.nonRecyclablePercentage) })} />
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("waste.recentRecords")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("waste.remoteDescription")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={visibleRemoteRecords.length === 0 || exportKind !== null || loadError !== null}
              onClick={() => void exportWasteHistory()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-border px-4 py-3 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60">
              {exportKind === "csv" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "csv" ? t("waste.exporting") : t("waste.exportCsv")}
            </button>
            <button type="button" disabled={visibleRemoteRecords.length === 0 || exportKind !== null || loadError !== null}
              onClick={() => void exportWasteHistoryExcel()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-primary px-4 py-3 text-sm font-semibold text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60">
              {exportKind === "excel" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "excel" ? t("waste.exportingExcel") : t("waste.exportExcel")}
            </button>
            <button type="button" disabled={registrationUnavailable}
              onClick={() => { setNotification(null); setIsModalOpen(true); }}
              className="rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60">
              + {t("waste.registerButton")}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-0 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-sm">
          {/* ZONA PRIMARIA (Siempre visible) */}
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            {/* Buscador por ID (flex-1) */}
            <label className="relative min-w-[250px] flex-1">
              <span className="sr-only">{t("waste.recordSearchLabel")}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ecoplaza-text-muted"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={recordSearch}
                disabled={isLoading || loadError !== null}
                onChange={(event) => setRecordSearch(event.target.value)}
                placeholder={t("waste.recordSearchPlaceholder")}
                aria-label={t("waste.recordSearchLabel")}
                className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background pl-10 pr-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              />
              {recordSearch.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setRecordSearch("")}
                  aria-label={t("waste.clearSearch")}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ecoplaza-text-muted hover:bg-ecoplaza-surface hover:text-ecoplaza-text"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>

            {/* Selector de Estado */}
            <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-ecoplaza-text-muted">
              <span>{t("waste.statusFilter")}</span>
              <select
                value={statusFilter}
                disabled={isLoading || loadError !== null}
                onChange={(event) => setStatusFilter(event.target.value as WasteStatus | "all")}
                aria-label={t("waste.statusFilter")}
                className="h-10 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                <option value="all">{t("waste.allStatuses")}</option>
                <option value="registered">{t("common.registered")}</option>
                <option value="available">{t("common.available")}</option>
                <option value="sold">{t("common.sold")}</option>
              </select>
            </label>

            {/* Botón Filtros avanzados */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={showAdvanced}
              aria-label={t("waste.advancedFilters")}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-ecoplaza-border bg-transparent px-3.5 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            >
              <SlidersHorizontal size={16} className="text-ecoplaza-text-muted" aria-hidden="true" />
              <span>{t("waste.advancedFilters")}</span>
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
                onClick={clearHistoryFilters}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ecoplaza-border/60 bg-transparent px-3.5 text-sm font-medium text-ecoplaza-danger transition-colors hover:border-ecoplaza-danger/40 hover:bg-ecoplaza-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={15} aria-hidden="true" />
                <span>{t("waste.clearFilters")}</span>
              </button>
            )}
          </div>

          {/* ZONA AVANZADA (Divulgación progresiva) */}
          {showAdvanced && (
            <div className="rounded-b-2xl border-t border-ecoplaza-border bg-ecoplaza-background/50 p-4 transition-all duration-300 ease-in-out">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {/* Selector de Categoría */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("waste.categoryFilter")}
                  </span>
                  <select
                    value={categoryFilter}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => setCategoryFilter(event.target.value as WasteCategory | "all")}
                    aria-label={t("waste.categoryFilter")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="all">{t("waste.allCategories")}</option>
                    <option value="organic">{t("common.organic")}</option>
                    <option value="recyclable">{t("common.recyclable")}</option>
                    <option value="nonRecyclable">{t("common.nonRecyclable")}</option>
                  </select>
                </label>

                {/* Selector de Contenedor */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("waste.containerFilter")}
                  </span>
                  <select
                    value={containerFilter}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => setContainerFilter(event.target.value)}
                    aria-label={t("waste.containerFilter")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="all">{t("waste.allContainers")}</option>
                    {containers.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.code}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Selector de Rango de Fechas (Popover) */}
                <div className="relative flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("waste.dateRange")}
                  </span>
                  <DateRangePickerButton
                    startDate={startDate}
                    endDate={endDate}
                    activeRange={activeDateRange}
                    error={dateRangeError}
                    disabled={isLoading || loadError !== null}
                    onApply={handleApplyDateRange}
                    onClear={handleClearDateRange}
                  />
                </div>

                {/* Selector Ordenar por */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                    {t("waste.sortLabel")}
                  </span>
                  <select
                    value={sortOption}
                    disabled={isLoading || loadError !== null}
                    onChange={(event) => setSortOption(event.target.value as WasteSortOption)}
                    aria-label={t("waste.sortLabel")}
                    className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    <option value="newest">{t("waste.sortNewest")}</option>
                    <option value="oldest">{t("waste.sortOldest")}</option>
                    <option value="weightDesc">{t("waste.sortWeightDesc")}</option>
                    <option value="weightAsc">{t("waste.sortWeightAsc")}</option>
                  </select>
                </label>
              </div>

              {dateRangeError && (
                <p role="alert" className="mt-3 text-xs text-ecoplaza-danger">
                  {t("waste.invalidDateRange")}
                </p>
              )}
              {activeDateRange !== null && (
                <p className="mt-2 text-xs font-medium text-ecoplaza-primary">
                  {t("waste.activeDateRange", {
                    start: formatColombianDate(activeDateRange.startDate),
                    end: formatColombianDate(activeDateRange.endDate),
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {!isLoading && loadError === null && (
          <div className="mt-4 rounded-2xl border border-ecoplaza-primary/20 bg-ecoplaza-primary/5 p-4" aria-label={t("waste.filteredSummaryTitle")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ecoplaza-text">{t("waste.filteredSummaryTitle")}</h3>
                <p className="mt-1 text-xs text-ecoplaza-text-muted">{t("waste.filteredSummaryDescription")}</p>
              </div>
              <dl className="flex gap-6 text-right">
                <div>
                  <dt className="text-xs text-ecoplaza-text-muted">{t("waste.filteredRecordCount")}</dt>
                  <dd className="mt-1 text-lg font-semibold text-ecoplaza-text">{filteredSummary.recordCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ecoplaza-text-muted">{t("waste.filteredTotalWeight")}</dt>
                  <dd className="mt-1 text-lg font-semibold text-ecoplaza-primary">{formatWeight(filteredSummary.totalWeightKg)}</dd>
                </div>
              </dl>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-ecoplaza-primary/15 pt-4 sm:grid-cols-3">
              {(["available", "sold", "registered"] as const).map((status) => (
                <div key={status} className="rounded-xl bg-ecoplaza-surface/70 px-3 py-2">
                  <dt className="text-xs font-medium text-ecoplaza-text-muted">{t(`common.${status}`)}</dt>
                  <dd className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold text-ecoplaza-text">
                      {t("waste.filteredStatusRecords", { count: filteredSummary.byStatus[status].recordCount })}
                    </span>
                    <span className="text-sm font-semibold text-ecoplaza-primary">
                      {formatWeight(filteredSummary.byStatus[status].totalWeightKg)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("waste.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button type="button" onClick={() => void loadRemoteData()} className="mt-4 flex items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary">
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("waste.retry")}
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("waste.noContainersTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("waste.noContainersDescription")}</p>
            </div>
          ) : filteredRemoteRecords.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
                {t(hasActiveFilters ? "waste.emptyFilteredTitle" : "waste.emptyTitle")}
              </h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">
                {t(hasActiveFilters ? "waste.emptyFilteredDescription" : "waste.emptyDescription")}
              </p>
            </div>
          ) : (
            <WasteRecordTable records={tableRecords} />
          )}
        </div>
      </div>

      {showDemoData && (
        <div className="mt-10 border-t border-ecoplaza-border pt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("waste.localRecords")}</h2>
            <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">{t("waste.localData")}</span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("waste.localDescription")}</p>
          <div className="mt-4"><WasteRecordTable records={legacyRecords} /></div>
        </div>
      )}

      {isModalOpen && (
        <WasteRegistrationModal
          containers={containers}
          isSubmitting={isSubmitting}
          onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
          onSubmit={(values) => void handleRegisterWaste(values)}
        />
      )}
      {notification && (
        <SuccessToast
          key={notification.id}
          title={t(notification.titleKey)}
          description={t(notification.descriptionKey)}
          closeLabel={t("waste.dismissNotification")}
          onClose={closeNotification}
          duration={notification.variant === "error" ? 7000 : undefined}
          variant={notification.variant}
        />
      )}
    </section>
  );
}

function WastePage() {
  const { user } = useAuth();
  return user ? <UserWastePage key={user.id} userId={user.id} /> : null;
}

export default WastePage;
