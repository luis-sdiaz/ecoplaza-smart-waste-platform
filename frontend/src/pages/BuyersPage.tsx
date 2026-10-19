import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, Download, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import BuyerFormModal from "../components/BuyerFormModal";
import BuyerTable from "../components/BuyerTable";
import BuyerPurchaseHistoryModal from "../components/BuyerPurchaseHistoryModal";
import DemoBuyerTable, { type DemoBuyer } from "../components/DemoBuyerTable";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SuccessToast from "../components/SuccessToast";
import { useDemoVisibility } from "../context/DemoVisibilityContext";
import {
  createBuyer,
  listBuyers,
  updateBuyer,
  type Buyer,
  type BuyerErrorCode,
  type BuyerInput,
} from "../services/buyerService";
import {
  filterAndSortBuyers,
  type BuyerActivityFilter,
  type BuyerContactFilter,
  type BuyerSortOption,
} from "../services/buyerFilters";
import { saveBuyerCsv, type BuyerCsvLabels } from "../services/buyerCsv";
import { saveBuyerExcel, type BuyerExcelLabels } from "../services/buyerExcelService";
import {
  listSales,
  type SaleHistoryItem,
  type SalesErrorCode,
} from "../services/salesService";

const demoBuyers: DemoBuyer[] = [
  { id: "BUY-001", name: "Reciclar del Sur", type: "Empresa recicladora", interest: "Reciclables", contact: "contacto@reciclardelsur.co", status: "Activo" },
  { id: "BUY-002", name: "BioCompost Nariño", type: "Productor de compost", interest: "Orgánicos", contact: "ventas@biocompost.co", status: "Activo" },
  { id: "BUY-003", name: "EcoMercado Local", type: "Comerciante", interest: "Reciclables", contact: "compras@ecomercado.co", status: "Interesado" },
  { id: "BUY-004", name: "Asociación Verde", type: "Asociación", interest: "Orgánicos", contact: "gestion@asociacionverde.co", status: "Activo" },
];

type BuyerNotification = {
  id: number;
  variant: "success" | "error";
  titleKey: string;
  descriptionKey: string;
};

function getBuyerErrorKey(code: BuyerErrorCode): string {
  if (code === "unauthorized") return "buyers.unauthorized";
  if (code === "invalid_name") return "buyers.invalidName";
  if (code === "invalid_email") return "buyers.invalidEmail";
  if (code === "invalid_phone") return "buyers.invalidPhone";
  if (code === "not_found") return "buyers.notFound";
  if (code === "network_error") return "buyers.networkError";
  if (code === "permission_denied") return "buyers.permissionError";
  if (code === "constraint_violation") return "buyers.constraintError";
  return "buyers.databaseError";
}

function getPurchaseHistoryErrorKey(code: SalesErrorCode): string {
  if (code === "unauthorized") return "buyers.purchaseHistoryUnauthorized";
  if (code === "network_error") return "buyers.purchaseHistoryNetworkError";
  if (code === "permission_denied") return "buyers.purchaseHistoryPermissionError";
  return "buyers.purchaseHistoryError";
}

function UserBuyersPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const { showDemoData } = useDemoVisibility();
  const requestRevisionRef = useRef(0);
  const historyRevisionRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const notificationSequenceRef = useRef(0);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<BuyerNotification | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<BuyerSortOption>("updated_desc");
  const [contactFilter, setContactFilter] = useState<BuyerContactFilter>("all");
  const [activityFilter, setActivityFilter] = useState<BuyerActivityFilter>("all");
  const [historyBuyer, setHistoryBuyer] = useState<Buyer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<SaleHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [exportKind, setExportKind] = useState<"csv" | "excel" | null>(null);

  const applyLoadResult = useCallback((
    result: Awaited<ReturnType<typeof listBuyers>>,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setBuyers([]);
      setLoadError(getBuyerErrorKey(result.error.code));
      setIsLoading(false);
      return;
    }

    setBuyers(result.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadBuyers = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);
    const result = await listBuyers();
    applyLoadResult(result, requestRevision);
  }, [applyLoadResult]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void listBuyers().then((result) => {
      applyLoadResult(result, requestRevision);
    });

    return () => {
      requestRevisionRef.current += 1;
      historyRevisionRef.current += 1;
    };
  }, [applyLoadResult, userId]);

  const closeNotification = useCallback(() => setNotification(null), []);
  const showNotification = useCallback((
    variant: BuyerNotification["variant"],
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

  const openCreateForm = (): void => {
    setEditingBuyer(null);
    setNotification(null);
    setIsFormOpen(true);
  };

  const openEditForm = (buyer: Buyer): void => {
    setEditingBuyer(buyer);
    setNotification(null);
    setIsFormOpen(true);
  };

  const loadPurchaseHistory = async (buyer: Buyer): Promise<void> => {
    const revision = ++historyRevisionRef.current;
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const result = await listSales(undefined, buyer.id);
      if (revision !== historyRevisionRef.current) return;

      if (!result.ok) {
        setPurchaseHistory([]);
        setHistoryError(getPurchaseHistoryErrorKey(result.error.code));
      } else {
        setPurchaseHistory(result.data);
        setHistoryError(null);
      }
    } catch {
      if (revision !== historyRevisionRef.current) return;
      setPurchaseHistory([]);
      setHistoryError("buyers.purchaseHistoryError");
    } finally {
      if (revision === historyRevisionRef.current) setIsHistoryLoading(false);
    }
  };

  const openPurchaseHistory = (buyer: Buyer): void => {
    setHistoryBuyer(buyer);
    setPurchaseHistory([]);
    void loadPurchaseHistory(buyer);
  };

  const closePurchaseHistory = (): void => {
    historyRevisionRef.current += 1;
    setHistoryBuyer(null);
    setPurchaseHistory([]);
    setHistoryError(null);
    setIsHistoryLoading(false);
  };

  const handleSubmit = async (values: BuyerInput): Promise<void> => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setNotification(null);
    const lifecycleRevision = requestRevisionRef.current;
    const buyerBeingEdited = editingBuyer;

    try {
      const result = buyerBeingEdited
        ? await updateBuyer(buyerBeingEdited.id, values)
        : await createBuyer(values);

      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (!result.ok) {
        showNotification("error", "buyers.saveErrorTitle", getBuyerErrorKey(result.error.code));
        return;
      }

      setBuyers((current) => {
        const remaining = current.filter((buyer) => buyer.id !== result.data.id);
        return [result.data, ...remaining];
      });
      setIsFormOpen(false);
      setEditingBuyer(null);
      showNotification(
        "success",
        buyerBeingEdited ? "buyers.updateSuccessTitle" : "buyers.createSuccessTitle",
        buyerBeingEdited ? "buyers.updateSuccessDescription" : "buyers.createSuccessDescription",
      );
    } catch {
      if (lifecycleRevision === requestRevisionRef.current) {
        showNotification("error", "buyers.saveErrorTitle", "buyers.databaseError");
      }
    } finally {
      isSubmittingRef.current = false;
      if (lifecycleRevision === requestRevisionRef.current) setIsSubmitting(false);
    }
  };

  const withEmail = buyers.filter((buyer) => buyer.email !== null).length;
  const withPhone = buyers.filter((buyer) => buyer.phone !== null).length;
  const metricsUnavailable = isLoading || loadError !== null;
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const visibleBuyers = filterAndSortBuyers(buyers, searchQuery, sortOption, locale, contactFilter, activityFilter);
  const hasActiveSearch = searchQuery.trim() !== "";
  const hasActiveFilters = hasActiveSearch || contactFilter !== "all" || activityFilter !== "all";

  const exportBuyers = async (): Promise<void> => {
    if (visibleBuyers.length === 0 || exportKind !== null) return;

    setExportKind("csv");
    setNotification(null);
    const labels: BuyerCsvLabels = {
      id: t("buyers.csv.id"),
      name: t("buyers.csv.name"),
      email: t("buyers.csv.email"),
      phone: t("buyers.csv.phone"),
    };

    try {
      const result = await saveBuyerCsv(
        visibleBuyers,
        labels,
        i18n.resolvedLanguage === "en" ? "en" : "es",
        `ecoplaza-buyers-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      if (result === "saved") {
        showNotification("success", "buyers.exportSuccessTitle", "buyers.exportSuccessDescription");
      }
    } catch {
      showNotification("error", "buyers.exportErrorTitle", "buyers.exportErrorDescription");
    } finally {
      setExportKind(null);
    }
  };

  const exportBuyersExcel = async (): Promise<void> => {
    if (visibleBuyers.length === 0 || exportKind !== null) return;

    setExportKind("excel");
    setNotification(null);
    const labels: BuyerExcelLabels = {
      workbookTitle: t("buyers.excel.workbookTitle"),
      sheetName: t("buyers.excel.sheetName"),
      id: t("buyers.excel.id"),
      name: t("buyers.excel.name"),
      email: t("buyers.excel.email"),
      phone: t("buyers.excel.phone"),
      updatedAt: t("buyers.excel.updatedAt"),
    };

    try {
      const result = await saveBuyerExcel(
        visibleBuyers,
        labels,
        `ecoplaza-buyers-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      if (result === "saved") {
        showNotification("success", "buyers.excelExportSuccessTitle", "buyers.excelExportSuccessDescription");
      }
    } catch {
      showNotification("error", "buyers.exportErrorTitle", "buyers.exportErrorDescription");
    } finally {
      setExportKind(null);
    }
  };

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("buyers.eyebrow")}
        title={t("buyers.title")}
        description={t("buyers.description")}
      />

      <div className="mt-8 grid grid-cols-3 gap-4">
        <MetricCard
          title={t("buyers.registered")}
          value={metricsUnavailable ? "—" : String(buyers.length)}
          description={t("buyers.registeredContacts")}
          badge={t("buyers.realData")}
        />
        <MetricCard
          title={t("buyers.withEmail")}
          value={metricsUnavailable ? "—" : String(withEmail)}
          description={t("buyers.withEmailDescription")}
          badge={t("buyers.realData")}
        />
        <MetricCard
          title={t("buyers.withPhone")}
          value={metricsUnavailable ? "—" : String(withPhone)}
          description={t("buyers.withPhoneDescription")}
          badge={t("buyers.realData")}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ecoplaza-text">{t("buyers.records")}</h2>
              <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">
                {t("buyers.realData")}
              </span>
            </div>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("buyers.recordsDescription")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={isLoading || loadError !== null || visibleBuyers.length === 0 || exportKind !== null}
              onClick={() => void exportBuyers()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-border px-4 py-3 text-sm font-medium text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "csv"
                ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                : <Download size={17} aria-hidden="true" />}
              {exportKind === "csv" ? t("buyers.exporting") : t("buyers.exportCsv")}
            </button>
            <button
              type="button"
              disabled={isLoading || loadError !== null || visibleBuyers.length === 0 || exportKind !== null}
              onClick={() => void exportBuyersExcel()}
              className="flex items-center gap-2 rounded-xl border border-ecoplaza-primary px-4 py-3 text-sm font-semibold text-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportKind === "excel"
                ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                : <Download size={17} aria-hidden="true" />}
              {exportKind === "excel" ? t("buyers.exportingExcel") : t("buyers.exportExcel")}
            </button>
            <button
              type="button"
              disabled={isLoading || loadError !== null}
              onClick={openCreateForm}
              className="rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              + {t("buyers.registerButton")}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">{t("buyers.searchLabel")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ecoplaza-text-muted" size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("buyers.searchPlaceholder")}
              className="w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background py-2.5 pr-3 pl-10 text-sm text-ecoplaza-text placeholder:text-ecoplaza-text-muted"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("buyers.contactFilter")}</span>
            <select value={contactFilter} disabled={isLoading || loadError !== null}
              onChange={(event) => setContactFilter(event.target.value as BuyerContactFilter)}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 py-2.5 text-sm text-ecoplaza-text">
              <option value="all">{t("buyers.allContacts")}</option>
              <option value="email">{t("buyers.withEmailFilter")}</option>
              <option value="phone">{t("buyers.withPhoneFilter")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("buyers.activityFilter")}</span>
            <select
              value={activityFilter}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setActivityFilter(event.target.value as BuyerActivityFilter)}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 py-2.5 text-sm text-ecoplaza-text"
            >
              <option value="all">{t("buyers.activityAll")}</option>
              <option value="with_purchases">{t("buyers.activityWithPurchases")}</option>
              <option value="without_purchases">{t("buyers.activityWithoutPurchases")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ecoplaza-text-muted">
            <span>{t("buyers.sortBy")}</span>
            <select
              value={sortOption}
              disabled={isLoading || loadError !== null}
              onChange={(event) => setSortOption(event.target.value as BuyerSortOption)}
              className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-3 py-2.5 text-sm text-ecoplaza-text"
            >
              <option value="updated_desc">{t("buyers.sortRecentlyUpdated")}</option>
              <option value="name_asc">{t("buyers.sortNameAsc")}</option>
              <option value="name_desc">{t("buyers.sortNameDesc")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("buyers.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button
                type="button"
                onClick={() => void loadBuyers()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("buyers.retry")}
              </button>
            </div>
          ) : buyers.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("buyers.emptyTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("buyers.emptyDescription")}</p>
            </div>
          ) : visibleBuyers.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Search size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("buyers.noSearchResultsTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("buyers.noSearchResultsDescription")}</p>
              {hasActiveFilters && <button type="button" onClick={() => { setSearchQuery(""); setContactFilter("all"); setActivityFilter("all"); }} className="mt-4 rounded-lg border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text">{t("buyers.clearFilters")}</button>}
            </div>
          ) : (
            <BuyerTable buyers={visibleBuyers} onEdit={openEditForm} onViewHistory={openPurchaseHistory} />
          )}
        </div>
      </div>

      {showDemoData && (
        <div className="mt-10 border-t border-ecoplaza-border pt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ecoplaza-text">{t("buyers.demoTitle")}</h2>
            <span className="rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
              {t("buyers.demoData")}
            </span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("buyers.demoDescription")}</p>
          <div className="mt-4">
            <DemoBuyerTable buyers={demoBuyers} />
          </div>
        </div>
      )}

      {isFormOpen && (
        <BuyerFormModal
          key={editingBuyer?.id ?? "new-buyer"}
          buyer={editingBuyer}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsFormOpen(false);
              setEditingBuyer(null);
            }
          }}
          onSubmit={(values) => void handleSubmit(values)}
        />
      )}

      {historyBuyer !== null && (
        <BuyerPurchaseHistoryModal
          buyer={historyBuyer}
          sales={purchaseHistory}
          isLoading={isHistoryLoading}
          error={historyError}
          onRetry={() => void loadPurchaseHistory(historyBuyer)}
          onClose={closePurchaseHistory}
        />
      )}

      {notification && (
        <SuccessToast
          key={notification.id}
          title={t(notification.titleKey)}
          description={t(notification.descriptionKey)}
          closeLabel={t("buyers.dismissNotification")}
          onClose={closeNotification}
          duration={notification.variant === "error" ? 7000 : undefined}
          variant={notification.variant}
        />
      )}
    </section>
  );
}

function BuyersPage() {
  const { user } = useAuth();
  return user ? <UserBuyersPage key={user.id} userId={user.id} /> : null;
}

export default BuyersPage;
