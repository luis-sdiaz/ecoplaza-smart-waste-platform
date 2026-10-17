import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, Download, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import ContainerStockSummaryTable from "../components/ContainerStockSummaryTable";
import InventoryTable, { type InventoryItem } from "../components/InventoryTable";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SuccessToast from "../components/SuccessToast";
import {
  listContainers,
  type Container,
  type ContainerErrorCode,
} from "../services/containerService";
import {
  calculateWasteStatistics,
  listAvailableWasteRecords,
  type RemoteWasteRecord,
  type WasteCategory,
  type WasteErrorCode,
} from "../services/wasteService";
import {
  filterAvailableInventory,
  sortAvailableInventory,
  summarizeAvailableStockByContainer,
  type InventorySortOption,
} from "../services/coreWorkflow";
import { saveInventoryCsv, type InventoryCsvLabels } from "../services/inventoryCsv";
import { getCsvCategoryLabels } from "../services/csvCategoryLabels";
import {
  filterInventoryByStorageAge,
  type InventoryAgeFilter,
} from "../services/inventoryAge";
import {
  saveInventoryExcel,
  type InventoryExcelLabels,
} from "../services/inventoryExcelService";

type InventoryResult = Awaited<ReturnType<typeof listAvailableWasteRecords>>;
type ContainersResult = Awaited<ReturnType<typeof listContainers>>;

function getInventoryErrorKey(code: WasteErrorCode | ContainerErrorCode): string {
  if (code === "unauthorized") return "inventory.unauthorized";
  if (code === "network_error") return "inventory.networkError";
  if (code === "permission_denied") return "inventory.permissionError";
  return "inventory.databaseError";
}

function InventoryPageContent() {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const [records, setRecords] = useState<RemoteWasteRecord[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<WasteCategory | "all">("all");
  const [containerFilter, setContainerFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState<InventoryAgeFilter>("all");
  const [recordSearch, setRecordSearch] = useState("");
  const [sortOption, setSortOption] = useState<InventorySortOption>("newest");
  const [ageReferenceDate, setAgeReferenceDate] = useState(() => new Date());
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);
  const [exportNotice, setExportNotice] = useState<"csvSuccess" | "excelSuccess" | "error" | null>(null);

  const applyResults = useCallback((
    inventoryResult: InventoryResult,
    containersResult: ContainersResult,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!inventoryResult.ok) {
      setRecords([]);
      setContainers([]);
      setLoadError(getInventoryErrorKey(inventoryResult.error.code));
      setIsLoading(false);
      return;
    }

    if (!containersResult.ok) {
      setRecords([]);
      setContainers([]);
      setLoadError(getInventoryErrorKey(containersResult.error.code));
      setIsLoading(false);
      return;
    }

    setRecords(inventoryResult.data);
    setContainers(containersResult.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadInventory = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    const [inventoryResult, containersResult] = await Promise.all([
      listAvailableWasteRecords(),
      listContainers(),
    ]);
    applyResults(inventoryResult, containersResult, requestRevision);
  }, [applyResults]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void Promise.all([listAvailableWasteRecords(), listContainers()]).then(
      ([inventoryResult, containersResult]) => {
        applyResults(inventoryResult, containersResult, requestRevision);
      },
    );

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyResults]);

  useEffect(() => {
    const now = new Date();
    const nextLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = window.setTimeout(
      () => setAgeReferenceDate(new Date()),
      Math.max(1, nextLocalDay.getTime() - now.getTime() + 50),
    );
    return () => window.clearTimeout(timeout);
  }, [ageReferenceDate]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const statistics = calculateWasteStatistics(records);
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(weightKg)} ${t("common.kg")}`;
  const realValueUnavailable = isLoading || loadError !== null;
  const metricValue = (weightKg: number): string =>
    realValueUnavailable ? "—" : formatWeight(weightKg);
  const containerCodes = new Map(containers.map((container) => [container.id, container.code]));
  const filteredRecords = filterAvailableInventory(records, categoryFilter, containerFilter, recordSearch);
  const ageFilteredRecords = filterInventoryByStorageAge(filteredRecords, ageFilter, ageReferenceDate);
  const visibleRecords = sortAvailableInventory(ageFilteredRecords, sortOption);
  const containerSummaries = summarizeAvailableStockByContainer(containers, records);
  const hasActiveFilters = categoryFilter !== "all" || containerFilter !== "all" || ageFilter !== "all" || recordSearch.trim() !== "";
  const tableItems: InventoryItem[] = visibleRecords.map((record) => ({
    id: `RES-${record.recordNumber.padStart(3, "0")}`,
    category: record.category,
    weightKg: record.weightKg,
    container: containerCodes.get(record.containerId) ?? t("inventory.unknownContainer"),
    registeredAt: record.registeredAt,
  }));

  const exportInventory = async (): Promise<void> => {
    if (visibleRecords.length === 0 || exportKind !== null) return;
    setExportKind("csv");
    setExportNotice(null);
    const labels: InventoryCsvLabels = {
      recordNumber: t("inventory.csv.recordNumber"), container: t("inventory.csv.container"),
      category: t("inventory.csv.category"), weightKg: t("inventory.csv.weightKg"),
      registeredAt: t("inventory.csv.registeredAt"), categories: getCsvCategoryLabels(t),
    };
    try {
      const result = await saveInventoryCsv(visibleRecords, containerCodes, labels,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        `ecoplaza-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
      if (result === "saved") setExportNotice("csvSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  const exportInventoryExcel = async (): Promise<void> => {
    if (visibleRecords.length === 0 || exportKind !== null) return;
    setExportKind("excel");
    setExportNotice(null);
    const labels: InventoryExcelLabels = {
      workbookTitle: t("inventory.excel.workbookTitle"),
      sheetName: t("inventory.excel.sheetName"),
      recordNumber: t("inventory.excel.recordNumber"),
      container: t("inventory.excel.container"),
      category: t("inventory.excel.category"),
      weightKg: t("inventory.excel.weightKg"),
      registeredAt: t("inventory.excel.registeredAt"),
      storageAgeDays: t("inventory.excel.storageAgeDays"),
      categories: getCsvCategoryLabels(t),
    };
    try {
      const result = await saveInventoryExcel(
        visibleRecords,
        containerCodes,
        labels,
        ageReferenceDate,
        `ecoplaza-inventory-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      if (result === "saved") setExportNotice("excelSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("inventory.eyebrow")}
        title={t("inventory.title")}
        description={t("inventory.description")}
      />

      {isLoading && (
        <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted">
          <LoaderCircle className="animate-spin text-ecoplaza-primary" size={18} strokeWidth={1.8} aria-hidden="true" />
          {t("inventory.loading")}
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
            onClick={() => void loadInventory()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 text-sm font-medium text-ecoplaza-danger"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("inventory.retry")}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("inventory.availableWeight")}
          value={metricValue(statistics.totalWeightKg)}
          description={t("inventory.availableWeightDescription")}
          badge={t("inventory.realData")}
        />
        <MetricCard
          title={t("common.organic")}
          value={metricValue(statistics.organicWeightKg)}
          description={t("inventory.categoryWeight")}
          badge={t("inventory.realData")}
        />
        <MetricCard
          title={t("common.recyclable")}
          value={metricValue(statistics.recyclableWeightKg)}
          description={t("inventory.categoryWeight")}
          badge={t("inventory.realData")}
        />
        <MetricCard
          title={t("common.nonRecyclable")}
          value={metricValue(statistics.nonRecyclableWeightKg)}
          description={t("inventory.categoryWeight")}
          badge={t("inventory.realData")}
        />
      </div>

      {!isLoading && !loadError && (
        <div className="mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ecoplaza-text">{t("inventory.stockByContainer")}</h2>
              <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("inventory.stockByContainerDescription")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
              {t("inventory.realData")}
            </span>
          </div>
          <div className="mt-4">
            <ContainerStockSummaryTable summaries={containerSummaries} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ecoplaza-text">
                {t("inventory.availableMaterials")}
              </h2>
              {!realValueUnavailable && (
                <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
                  {t("inventory.recordCount", { count: visibleRecords.length })}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">
              {t("inventory.availableMaterialsDescription")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={visibleRecords.length === 0 || exportKind !== null || loadError !== null}
              onClick={() => void exportInventory()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60">
              {exportKind === "csv" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "csv" ? t("inventory.exporting") : t("inventory.exportCsv")}
            </button>
            <button type="button" disabled={visibleRecords.length === 0 || exportKind !== null || loadError !== null}
              onClick={() => void exportInventoryExcel()}
              className="flex items-center gap-2 rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {exportKind === "excel" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              {exportKind === "excel" ? t("inventory.exportingExcel") : t("inventory.exportExcel")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <label className="relative min-w-64 flex-1">
            <span className="sr-only">{t("inventory.recordSearchLabel")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ecoplaza-text-muted" size={17} aria-hidden="true" />
            <input
              type="search"
              value={recordSearch}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setRecordSearch(event.target.value)}
              placeholder={t("inventory.recordSearchPlaceholder")}
              className="h-10 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface pl-10 pr-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted/75"
            />
            {recordSearch.trim() !== "" && (
              <button type="button" onClick={() => setRecordSearch("")} aria-label={t("inventory.clearSearch")}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ecoplaza-text-muted">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("inventory.ageFilter")}</span>
            <select
              value={ageFilter}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setAgeFilter(event.target.value as InventoryAgeFilter)}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text"
            >
              <option value="all">{t("inventory.allAges")}</option>
              <option value="upTo7">{t("inventory.ageUpTo7")}</option>
              <option value="from8To30">{t("inventory.ageFrom8To30")}</option>
              <option value="over30">{t("inventory.ageOver30")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("inventory.categoryFilter")}</span>
            <select
              value={categoryFilter}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setCategoryFilter(event.target.value as WasteCategory | "all")}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text"
            >
              <option value="all">{t("inventory.allCategories")}</option>
              <option value="organic">{t("common.organic")}</option>
              <option value="recyclable">{t("common.recyclable")}</option>
              <option value="nonRecyclable">{t("common.nonRecyclable")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("inventory.sortBy")}</span>
            <select value={sortOption} onChange={(event) => setSortOption(event.target.value as InventorySortOption)}
              disabled={isLoading || loadError !== null}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text">
              <option value="newest">{t("inventory.sortNewest")}</option>
              <option value="oldest">{t("inventory.sortOldest")}</option>
              <option value="weightDesc">{t("inventory.sortWeightDesc")}</option>
              <option value="weightAsc">{t("inventory.sortWeightAsc")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("inventory.containerFilter")}</span>
            <select
              value={containerFilter}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setContainerFilter(event.target.value)}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text"
            >
              <option value="all">{t("inventory.allContainers")}</option>
              {containers.map((container) => <option key={container.id} value={container.id}>{container.code}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={!hasActiveFilters || isLoading}
            onClick={() => { setCategoryFilter("all"); setContainerFilter("all"); setAgeFilter("all"); setRecordSearch(""); }}
            className="rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("inventory.clearFilters")}
          </button>
        </div>

        <div className="mt-4">
          {!isLoading && !loadError && tableItems.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
                {t(hasActiveFilters ? "inventory.emptyFilteredTitle" : "inventory.emptyTitle")}
              </h3>
              <p className="mt-1 max-w-md text-sm text-ecoplaza-text-muted">
                {t(hasActiveFilters ? "inventory.emptyFilteredDescription" : "inventory.emptyDescription")}
              </p>
            </div>
          ) : !isLoading && !loadError ? (
            <InventoryTable items={tableItems} />
          ) : null}
        </div>
      </div>
      {exportNotice !== null && (
        <SuccessToast title={t(exportNotice === "csvSuccess" ? "inventory.exportSuccessTitle" : exportNotice === "excelSuccess" ? "inventory.excelExportSuccessTitle" : "inventory.exportErrorTitle")}
          description={t(exportNotice === "csvSuccess" ? "inventory.exportSuccessDescription" : exportNotice === "excelSuccess" ? "inventory.excelExportSuccessDescription" : "inventory.exportErrorDescription")}
          closeLabel={t("inventory.dismissNotification")} variant={exportNotice === "error" ? "error" : "success"}
          onClose={() => setExportNotice(null)} />
      )}
    </section>
  );
}

function InventoryPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <InventoryPageContent key={user.id} />;
}

export default InventoryPage;
