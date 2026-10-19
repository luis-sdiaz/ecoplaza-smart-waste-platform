import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Box, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import { listContainers } from "../services/containerService";
import { listAvailableWasteRecords } from "../services/wasteService";
import {
  filterContainers,
  type Container,
  type ContainerStockFilter,
} from "../services/containerFilters";

type ContainersPageProps = {
  initialContainers?: Container[];
};

export function ContainersPage({ initialContainers }: ContainersPageProps) {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const [containers, setContainers] = useState<Container[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<ContainerStockFilter>("all");
  const [isLoading, setIsLoading] = useState(initialContainers === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const effectiveContainers = initialContainers ?? containers;
  const isBusy = initialContainers === undefined && isLoading;

  const applyLoadResults = useCallback(
    (
      containersResult: Awaited<ReturnType<typeof listContainers>>,
      stockResult: Awaited<ReturnType<typeof listAvailableWasteRecords>>,
      revision: number,
    ) => {
      if (revision !== requestRevisionRef.current) return;

      if (!containersResult.ok) {
        setContainers([]);
        setLoadError("containers.databaseError");
        setIsLoading(false);
        return;
      }

      const wasteRecords = stockResult.ok ? stockResult.data : [];
      const weightByContainer = new Map<string, number>();
      const categoryByContainer = new Map<string, string>();

      for (const record of wasteRecords) {
        if (record.status === "available") {
          const currentWeight = weightByContainer.get(record.containerId) ?? 0;
          weightByContainer.set(record.containerId, currentWeight + record.weightKg);
          if (!categoryByContainer.has(record.containerId)) {
            categoryByContainer.set(record.containerId, record.category);
          }
        }
      }

      const enrichedContainers: Container[] = containersResult.data.map((container) => ({
        id: container.id,
        code: container.code,
        createdAt: container.createdAt,
        currentWeightKg: weightByContainer.get(container.id) ?? 0,
        category: categoryByContainer.get(container.id) ?? null,
      }));

      setContainers(enrichedContainers);
      setLoadError(null);
      setIsLoading(false);
    },
    [],
  );

  const loadContainers = useCallback(async () => {
    const revision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const [containersResult, stockResult] = await Promise.all([
        listContainers(),
        listAvailableWasteRecords(),
      ]);
      applyLoadResults(containersResult, stockResult, revision);
    } catch {
      if (revision === requestRevisionRef.current) {
        setContainers([]);
        setLoadError("containers.databaseError");
        setIsLoading(false);
      }
    }
  }, [applyLoadResults]);

  useEffect(() => {
    if (initialContainers !== undefined) return;

    const revision = ++requestRevisionRef.current;
    void Promise.all([listContainers(), listAvailableWasteRecords()])
      .then(([containersResult, stockResult]) => {
        applyLoadResults(containersResult, stockResult, revision);
      })
      .catch(() => {
        if (revision === requestRevisionRef.current) {
          setContainers([]);
          setLoadError("containers.databaseError");
          setIsLoading(false);
        }
      });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyLoadResults, initialContainers]);

  const visibleContainers = useMemo(
    () => filterContainers(effectiveContainers, { query: searchQuery, stockFilter }),
    [effectiveContainers, searchQuery, stockFilter],
  );

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const formatWeight = (weightKg: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(weightKg)} ${t("common.kg")}`;

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("containers.remoteData")}
        title={t("containers.title")}
        description={t("containers.description")}
      />

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ecoplaza-text">
              {t("containers.title")}
            </h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">
              {t("containers.count", { count: visibleContainers.length })}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-4">
          <label className="relative min-w-[280px] flex-1">
            <span className="sr-only">{t("containers.searchLabel")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ecoplaza-text-muted" size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              disabled={isBusy || loadError !== null}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("containers.searchPlaceholder")}
              aria-label={t("containers.searchLabel")}
              className="w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background py-2.5 pr-10 pl-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            />
            {searchQuery.trim() !== "" && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={t("containers.clearSearch")}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>

          <label className="flex shrink-0 items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("containers.stockFilter")}</span>
            <select
              value={stockFilter}
              disabled={isBusy || loadError !== null}
              onChange={(event) => setStockFilter(event.target.value as ContainerStockFilter)}
              aria-label={t("containers.stockFilter")}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 py-2.5 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            >
              <option value="all">{t("containers.stockAll")}</option>
              <option value="with_stock">{t("containers.stockWith")}</option>
              <option value="empty">{t("containers.stockEmpty")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          {isBusy ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("containers.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button
                type="button"
                onClick={() => void loadContainers()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : effectiveContainers.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Box size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("containers.emptyTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("containers.emptyDescription")}</p>
            </div>
          ) : visibleContainers.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Search size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("containers.noSearchResultsTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("containers.noSearchResultsDescription")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
              <table className="w-full min-w-150">
                <thead className="bg-ecoplaza-background">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.container")}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("common.category")}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("inventory.availableWeight")}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">{t("containers.stockFilter")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContainers.map((container) => {
                    const weight = container.currentWeightKg ?? container.availableWeightKg ?? 0;
                    const hasStock = weight > 0;
                    return (
                      <tr key={container.id} className="border-t border-ecoplaza-border">
                        <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">{container.code}</td>
                        <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">{container.wasteType ?? container.category ?? "—"}</td>
                        <td className="px-5 py-4 text-sm text-ecoplaza-text">{formatWeight(weight)}</td>
                        <td className="px-5 py-4 text-sm">
                          <span
                            className={hasStock
                              ? "rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-xs font-medium text-ecoplaza-primary"
                              : "rounded-full bg-ecoplaza-background px-2.5 py-1 text-xs font-medium text-ecoplaza-text-muted"}
                          >
                            {t(hasStock ? "containers.stockWith" : "containers.stockEmpty")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ContainersPage;

