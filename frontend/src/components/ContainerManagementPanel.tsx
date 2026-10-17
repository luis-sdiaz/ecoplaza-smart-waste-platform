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
  sortContainers,
  summarizeAvailableStockByContainer,
  type ContainerSortOption,
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

function ContainerManagementPanel() {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const isCreatingRef = useRef(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [stockByContainer, setStockByContainer] = useState<Map<string, ContainerStockSummary>>(new Map());
  const [code, setCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<ContainerSortOption>("codeAsc");
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
  const visibleContainers = sortContainers(filteredContainers, sortOption, locale);
  const hasActiveSearch = normalizedSearch !== "";
  const feedbackClass = feedback?.tone === "success"
    ? "border-ecoplaza-primary/30 bg-ecoplaza-primary/10 text-ecoplaza-primary"
    : "border-ecoplaza-danger/30 bg-ecoplaza-danger/10 text-ecoplaza-danger";
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

  return (
    <section className="mt-10" aria-labelledby="user-containers-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="user-containers-title" className="text-lg font-semibold text-ecoplaza-text">
              {t("containers.title")}
            </h2>
            <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">
              {t("containers.remoteData")}
            </span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("containers.description")}
          </p>
        </div>
        {!isLoading && !loadError && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-medium text-ecoplaza-text-muted">
              {t("containers.count", { count: visibleContainers.length })}
            </span>
            <button
              type="button"
              disabled={visibleContainers.length === 0 || exportKind !== null}
              onClick={() => void exportContainers()}
              className="flex h-10 items-center gap-2 rounded-xl border border-ecoplaza-border px-3 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "csv"
                ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                : <Download size={16} aria-hidden="true" />}
              {exportKind === "csv" ? t("containers.exporting") : t("containers.exportCsv")}
            </button>
            <button
              type="button"
              disabled={visibleContainers.length === 0 || exportKind !== null}
              onClick={() => void exportContainersExcel()}
              className="flex h-10 items-center gap-2 rounded-xl border border-ecoplaza-primary px-3 text-sm font-semibold text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "excel"
                ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                : <Download size={16} aria-hidden="true" />}
              {exportKind === "excel" ? t("containers.exportingExcel") : t("containers.exportExcel")}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
        <div className="min-h-48 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
          {!isLoading && !loadError && containers.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <label htmlFor="container-search" className="sr-only">{t("containers.searchLabel")}</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ecoplaza-text-muted" size={17} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="container-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("containers.searchPlaceholder")}
                  className="h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background/70 pl-10 pr-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted/75 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                />
                {hasActiveSearch && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("containers.clearSearch")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
                  >
                    <X size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div>
                <label htmlFor="container-sort" className="sr-only">{t("containers.sortLabel")}</label>
                <select
                  id="container-sort"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as ContainerSortOption)}
                  className="h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background/70 px-3 text-sm text-ecoplaza-text focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
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
            <div role="status" className="flex min-h-38 items-center justify-center gap-3 text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("containers.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-38 flex-col items-center justify-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button
                type="button"
                onClick={() => void loadUserContainers()}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex min-h-38 flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-background text-ecoplaza-primary">
                <Box size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("containers.emptyTitle")}</h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-ecoplaza-text-muted">{t("containers.emptyDescription")}</p>
            </div>
          ) : visibleContainers.length === 0 ? (
            <div className="flex min-h-38 flex-col items-center justify-center text-center">
              <Search size={22} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("containers.noSearchResultsTitle")}</h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-ecoplaza-text-muted">{t("containers.noSearchResultsDescription")}</p>
            </div>
          ) : (
            <div>
              {stockLoadError && (
                <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-ecoplaza-warning/30 bg-ecoplaza-warning/10 px-3 py-2 text-xs leading-5 text-ecoplaza-text">
                  <AlertTriangle className="mt-0.5 shrink-0 text-ecoplaza-warning" size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>{t("containers.stockLoadError")}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
              {visibleContainers.map((container) => (
                <article key={container.id} className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/55 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
                      <Database size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ecoplaza-text">{container.code}</h3>
                      <p className="mt-1 text-xs text-ecoplaza-text-muted">
                        {t("containers.createdAt", {
                          date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(container.createdAt)),
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 break-all font-mono text-[10px] leading-4 text-ecoplaza-text-muted" title={container.id}>
                    {container.id}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ecoplaza-border pt-3">
                    <div>
                      <dt className="text-[11px] text-ecoplaza-text-muted">{t("containers.availableRecords")}</dt>
                      <dd className="mt-1 text-sm font-semibold text-ecoplaza-text">
                        {isStockLoading || stockLoadError
                          ? "—"
                          : (stockByContainer.get(container.id)?.availableRecordCount ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-ecoplaza-text-muted">{t("containers.availableWeight")}</dt>
                      <dd className="mt-1 text-sm font-semibold text-ecoplaza-text">
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

        <form onSubmit={handleSubmit} noValidate className="self-start rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
          <h3 className="text-base font-semibold text-ecoplaza-text">{t("containers.registerTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-ecoplaza-text-muted">{t("containers.registerDescription")}</p>
          <label htmlFor="container-code" className="mt-4 block text-sm font-medium text-ecoplaza-text">
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
            className="mt-2 h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background/70 px-3 font-mono text-sm uppercase text-ecoplaza-text transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-ecoplaza-text-muted/75 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          {!feedback && (
            <p id="container-code-help" className="mt-1.5 text-xs leading-4 text-ecoplaza-text-muted">
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
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ecoplaza-primary px-4 text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65"
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
