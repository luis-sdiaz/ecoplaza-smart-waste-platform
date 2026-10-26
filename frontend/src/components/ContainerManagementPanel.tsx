import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Box,
  CircleCheck,
  Database,
  Download,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  createContainer,
  listContainers,
  type Container,
  type ContainerErrorCode,
} from "../services/containerService";
import {
  filterContainersByStock,
  sortContainers,
  summarizeAvailableStockByContainer,
  type ContainerSortOption,
  type ContainerStockFilter,
  type ContainerStockSummary,
} from "../services/coreWorkflow";
import { listAvailableWasteRecords } from "../services/wasteService";
import { saveContainerCsv, type ContainerCsvLabels } from "../services/containerCsv";
import { saveContainerExcel, type ContainerExcelLabels } from "../services/containerExcelService";
import SuccessToast from "./SuccessToast";

type Feedback = {
  tone: "error" | "success";
  key: string;
};

function getContainerErrorKey(code: ContainerErrorCode): string {
  if (code === "unauthorized") return "containers.unauthorized";
  if (code === "invalid_code") return "containers.invalidCode";
  if (code === "duplicate_code") return "containers.duplicateCode";
  if (code === "network_error") return "containers.networkError";
  if (code === "permission_denied") return "containers.permissionError";
  return "containers.databaseError";
}

export type ContainerManagementPanelProps = {
  isOpen?: boolean;
  onClose?: () => void;
  testId?: string;
};

function ContainerManagementPanel({
  isOpen = true,
  onClose,
  testId = "container-management-panel",
}: ContainerManagementPanelProps = {}) {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const isCreatingRef = useRef(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [stockByContainer, setStockByContainer] = useState<Map<string, ContainerStockSummary>>(new Map());
  const [code, setCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<ContainerSortOption>("codeAsc");
  const [stockFilter, setStockFilter] = useState<ContainerStockFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);
  const [exportNotice, setExportNotice] = useState<"csvSuccess" | "excelSuccess" | "error" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [stockLoadError, setStockLoadError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const isFormUnavailable = isCreating || isLoading || loadError !== null;

  const applyLoadResults = useCallback((
    containersResult: Awaited<ReturnType<typeof listContainers>>,
    stockResult: Awaited<ReturnType<typeof listAvailableWasteRecords>>,
    requestRevision: number,
  ) => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!containersResult.ok) {
      setContainers([]);
      setStockByContainer(new Map());
      setLoadError(getContainerErrorKey(containersResult.error.code));
      setStockLoadError(false);
      setIsStockLoading(false);
      setIsLoading(false);
      return;
    }

    setContainers(containersResult.data);
    if (stockResult.ok) {
      const summaries = summarizeAvailableStockByContainer(containersResult.data, stockResult.data);
      setStockByContainer(new Map(summaries.map((summary) => [summary.containerId, summary])));
      setStockLoadError(false);
    } else {
      setStockByContainer(new Map());
      setStockLoadError(true);
    }
    setIsStockLoading(false);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadUserContainers = useCallback(async () => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setIsStockLoading(true);
    setLoadError(null);
    setStockLoadError(false);

    const [containersResult, stockResult] = await Promise.all([
      listContainers(),
      listAvailableWasteRecords(),
    ]);
    applyLoadResults(containersResult, stockResult, requestRevision);
  }, [applyLoadResults]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void Promise.all([listContainers(), listAvailableWasteRecords()]).then(
      ([containersResult, stockResult]) => {
        applyLoadResults(containersResult, stockResult, requestRevision);
      },
    );

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyLoadResults]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingRef.current || isLoading || loadError !== null) return;

    isCreatingRef.current = true;
    setIsCreating(true);
    setFeedback(null);
    const lifecycleRevision = requestRevisionRef.current;

    try {
      const result = await createContainer(code);
      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (!result.ok) {
        setFeedback({ tone: "error", key: getContainerErrorKey(result.error.code) });
        return;
      }

      setContainers((current) => [...current, result.data]);
      if (!isStockLoading && !stockLoadError) {
        setStockByContainer((current) => {
          const next = new Map(current);
          next.set(result.data.id, {
            containerId: result.data.id,
            containerCode: result.data.code,
            availableWeightKg: 0,
            availableRecordCount: 0,
          });
          return next;
        });
      }
      setCode("");
      setFeedback({ tone: "success", key: "containers.createSuccess" });
    } catch {
      if (lifecycleRevision === requestRevisionRef.current) {
        setFeedback({ tone: "error", key: "containers.databaseError" });
      }
    } finally {
      isCreatingRef.current = false;
      if (lifecycleRevision === requestRevisionRef.current) {
        setIsCreating(false);
      }
    }
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase(locale);
  const filteredContainers = normalizedSearch === ""
    ? containers
    : containers.filter((container) =>
        container.code.toLocaleLowerCase(locale).includes(normalizedSearch)
      );
  const stockFilteredContainers = !isStockLoading && !stockLoadError
    ? filterContainersByStock(filteredContainers, stockByContainer, stockFilter)
    : filteredContainers;
  const visibleContainers = sortContainers(stockFilteredContainers, sortOption, locale);
  const hasActiveSearch = normalizedSearch !== "";
  const hasActiveStockFilter = stockFilter !== "all";
  const hasAppliedStockFilter = hasActiveStockFilter && !isStockLoading && !stockLoadError;
  const feedbackClass = feedback?.tone === "success"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(weightKg)} ${t("common.kg")}`;

  const exportContainers = async (): Promise<void> => {
    if (visibleContainers.length === 0 || exportKind !== null) return;

    setExportKind("csv");
    setExportNotice(null);
    const labels: ContainerCsvLabels = {
      id: t("containers.csv.id"),
      code: t("containers.csv.code"),
      createdAt: t("containers.csv.createdAt"),
    };

    try {
      const result = await saveContainerCsv(
        visibleContainers,
        labels,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        `ecoplaza-containers-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      if (result === "saved") setExportNotice("csvSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  const exportContainersExcel = async (): Promise<void> => {
    if (visibleContainers.length === 0 || exportKind !== null) return;

    setExportKind("excel");
    setExportNotice(null);
    const labels: ContainerExcelLabels = {
      workbookTitle: t("containers.excel.workbookTitle"),
      sheetName: t("containers.excel.sheetName"),
      id: t("containers.excel.id"),
      code: t("containers.excel.code"),
      createdAt: t("containers.excel.createdAt"),
      availableRecordCount: t("containers.excel.availableRecordCount"),
      availableWeightKg: t("containers.excel.availableWeightKg"),
    };

    try {
      const result = await saveContainerExcel(
        visibleContainers,
        stockByContainer,
        labels,
        `ecoplaza-containers-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      if (result === "saved") setExportNotice("excelSuccess");
    } catch {
      setExportNotice("error");
    } finally {
      setExportKind(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <section
      role="region"
      data-testid={testId}
      className="glass-panel rounded-2xl p-6 shadow-sm"
      aria-labelledby="user-containers-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && onClose) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start justify-between gap-4 w-full sm:w-auto">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="user-containers-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("containers.title")}
              </h2>
              <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                {t("containers.remoteData")}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("containers.description")}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("containers.closePanel")}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {!isLoading && !loadError && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("containers.count", { count: visibleContainers.length })}
            </span>
            <button
              type="button"
              disabled={visibleContainers.length === 0 || exportKind !== null}
              aria-busy={exportKind === "csv"}
              onClick={() => void exportContainers()}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "csv"
                ? <LoaderCircle className="animate-spin text-emerald-600 dark:text-emerald-400" size={15} aria-hidden="true" />
                : <Download size={15} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />}
              {exportKind === "csv" ? t("containers.exporting") : t("containers.exportCsv")}
            </button>
            <button
              type="button"
              disabled={visibleContainers.length === 0 || exportKind !== null}
              aria-busy={exportKind === "excel"}
              onClick={() => void exportContainersExcel()}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "excel"
                ? <LoaderCircle className="animate-spin text-emerald-600 dark:text-emerald-400" size={15} aria-hidden="true" />
                : <Download size={15} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
              {exportKind === "excel" ? t("containers.exportingExcel") : t("containers.exportExcel")}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-6">
        <div className="min-h-48 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 p-5 backdrop-blur-sm">
          {!isLoading && !loadError && containers.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px]">
              <div className="relative">
                <label htmlFor="container-search" className="sr-only">{t("containers.searchLabel")}</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="container-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("containers.searchPlaceholder")}
                  className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-black/20 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:outline-none"
                />
                {hasActiveSearch && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("containers.clearSearch")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div>
                <label htmlFor="container-stock-filter" className="sr-only">{t("containers.stockFilterLabel")}</label>
                <select
                  id="container-stock-filter"
                  value={stockFilter}
                  disabled={isStockLoading || stockLoadError}
                  onChange={(event) => setStockFilter(event.target.value as ContainerStockFilter)}
                  className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-[#121c15] px-3 text-sm text-slate-900 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:border-emerald-500 focus-visible:outline-none"
                >
                  <option value="all">{t("containers.allStock")}</option>
                  <option value="withStock">{t("containers.withStock")}</option>
                  <option value="withoutStock">{t("containers.withoutStock")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="container-sort" className="sr-only">{t("containers.sortLabel")}</label>
                <select
                  id="container-sort"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as ContainerSortOption)}
                  className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-[#121c15] px-3 text-sm text-slate-900 dark:text-slate-100 focus-visible:border-emerald-500 focus-visible:outline-none"
                >
                  <option value="codeAsc">{t("containers.sortCodeAsc")}</option>
                  <option value="codeDesc">{t("containers.sortCodeDesc")}</option>
                  <option value="newest">{t("containers.sortNewest")}</option>
                  <option value="oldest">{t("containers.sortOldest")}</option>
                </select>
              </div>
            </div>
          )}
          {isLoading ? (
            <div role="status" className="flex min-h-38 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle className="animate-spin text-emerald-600 dark:text-emerald-400" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("containers.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-38 flex-col items-center justify-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">{t(loadError)}</p>
              <button
                type="button"
                onClick={() => void loadUserContainers()}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex min-h-38 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-6 text-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Box size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("containers.emptyTitle")}</h3>
              <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{t("containers.emptyDescription")}</p>
            </div>
          ) : visibleContainers.length === 0 ? (
            <div className="flex min-h-38 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-6 text-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400">
                <Search size={22} strokeWidth={1.8} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t(hasAppliedStockFilter ? "containers.noFilteredResultsTitle" : "containers.noSearchResultsTitle")}
              </h3>
              <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t(hasAppliedStockFilter ? "containers.noFilteredResultsDescription" : "containers.noSearchResultsDescription")}
              </p>
            </div>
          ) : (
            <div>
              {stockLoadError && (
                <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>{t("containers.stockLoadError")}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleContainers.map((container) => (
                <article key={container.id} className="glass-card rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/5 p-4 hover:border-emerald-500/40 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Database size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{container.code}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t("containers.createdAt", {
                          date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(container.createdAt)),
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 break-all font-mono text-[10px] leading-4 text-slate-400 dark:text-slate-500" title={container.id}>
                    {container.id}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 dark:border-white/10 pt-3">
                    <div>
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{t("containers.availableRecords")}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isStockLoading || stockLoadError
                          ? "—"
                          : (stockByContainer.get(container.id)?.availableRecordCount ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{t("containers.availableWeight")}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isStockLoading || stockLoadError
                          ? "—"
                          : formatWeight(stockByContainer.get(container.id)?.availableWeightKg ?? 0)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="self-start rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/5 p-5 backdrop-blur-sm shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("containers.registerTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("containers.registerDescription")}</p>
          <label htmlFor="container-code" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("containers.codeLabel")}
          </label>
          <input
            id="container-code"
            name="containerCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            required
            disabled={isFormUnavailable}
            value={code}
            onChange={(event) => { setCode(event.target.value); setFeedback(null); }}
            placeholder={t("containers.codePlaceholder")}
            aria-invalid={feedback?.tone === "error"}
            aria-describedby={feedback ? "container-form-feedback" : "container-code-help"}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 px-3 font-mono text-sm uppercase text-slate-900 dark:text-slate-100 transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {!feedback && (
            <p id="container-code-help" className="mt-1.5 text-xs leading-4 text-slate-500 dark:text-slate-400">
              {t("containers.codeHelp")}
            </p>
          )}
          {feedback && (
            <p
              id="container-form-feedback"
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}
            >
              {feedback.tone === "success"
                ? <CircleCheck className="mt-0.5 shrink-0" size={15} strokeWidth={1.8} aria-hidden="true" />
                : <AlertTriangle className="mt-0.5 shrink-0" size={15} strokeWidth={1.8} aria-hidden="true" />}
              <span>{t(feedback.key)}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={isFormUnavailable}
            aria-busy={isCreating}
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isCreating
              ? <LoaderCircle className="animate-spin" size={17} strokeWidth={1.8} aria-hidden="true" />
              : <Plus size={17} strokeWidth={1.8} aria-hidden="true" />}
            {t(isCreating ? "containers.registering" : "containers.register")}
          </button>
        </form>
      </div>
      {exportNotice !== null && (
        <SuccessToast
          title={t(exportNotice === "csvSuccess" ? "containers.exportSuccessTitle" : exportNotice === "excelSuccess" ? "containers.excelExportSuccessTitle" : "containers.exportErrorTitle")}
          description={t(exportNotice === "csvSuccess" ? "containers.exportSuccessDescription" : exportNotice === "excelSuccess" ? "containers.excelExportSuccessDescription" : "containers.exportErrorDescription")}
          closeLabel={t("containers.dismissNotification")}
          variant={exportNotice === "error" ? "error" : "success"}
          onClose={() => setExportNotice(null)}
        />
      )}
    </section>
  );
}

export default ContainerManagementPanel;
