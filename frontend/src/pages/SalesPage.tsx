import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, LoaderCircle, RefreshCw } from "lucide-react";
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
import SalesTable from "../components/SalesTable";
import SuccessToast from "../components/SuccessToast";

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

async function fetchSalesPageData(): Promise<{
  salesResult: SalesListResult;
  formDataResult: SaleFormDataResult;
}> {
  const [salesResult, formDataResult] = await Promise.all([
    listSales(),
    getSaleFormData(),
  ]);
  return { salesResult, formDataResult };
}

function UserSalesPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const notificationSequenceRef = useRef(0);
  const [sales, setSales] = useState<SaleHistoryItem[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [wasteRecords, setWasteRecords] = useState<RemoteWasteRecord[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<SalesNotification | null>(null);

  const applyLoadResults = useCallback((
    salesResult: SalesListResult,
    formDataResult: SaleFormDataResult,
    requestRevision: number,
  ): boolean => {
    if (requestRevision !== requestRevisionRef.current) return false;

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

  const loadSalesData = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    const { salesResult, formDataResult } = await fetchSalesPageData();
    applyLoadResults(salesResult, formDataResult, requestRevision);
  }, [applyLoadResults]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void fetchSalesPageData().then(({ salesResult, formDataResult }) => {
      applyLoadResults(salesResult, formDataResult, requestRevision);
    });

    return () => {
      requestRevisionRef.current += 1;
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
    const lifecycleRevision = requestRevisionRef.current;

    try {
      const result = await createSale(values);
      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (result.ok) {
        const historyItem: SaleHistoryItem = {
          ...result.data,
          buyerName: selectedBuyer.name,
          wasteRecordNumber: selectedWasteRecord.recordNumber,
          category: selectedWasteRecord.category,
        };
        setSales((current) => [historyItem, ...current.filter((sale) => sale.id !== historyItem.id)]);
        setWasteRecords((current) => current.filter((record) => record.id !== values.wasteRecordId));
        setIsModalOpen(false);
        showNotification("success", "sales.createSuccessTitle", "sales.createSuccessDescription");
        return;
      }

      if (result.error.code === "confirmation_unknown") {
        const refreshedData = await fetchSalesPageData();
        if (lifecycleRevision !== requestRevisionRef.current) return;

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

        const confirmedSale = refreshedData.salesResult.data.find(
          (sale) => sale.wasteRecordId === values.wasteRecordId,
        );
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
        const refreshedData = await fetchSalesPageData();
        if (lifecycleRevision !== requestRevisionRef.current) return;

        applyLoadResults(
          refreshedData.salesResult,
          refreshedData.formDataResult,
          lifecycleRevision,
        );
        setIsModalOpen(false);
      }

      showNotification("error", "sales.createErrorTitle", getSalesErrorKey(result.error.code));
    } catch {
      if (lifecycleRevision === requestRevisionRef.current) {
        setLoadError("sales.confirmationUnknown");
        setIsModalOpen(false);
        showNotification("error", "sales.confirmationPendingTitle", "sales.confirmationUnknown");
      }
    } finally {
      isSubmittingRef.current = false;
      if (lifecycleRevision === requestRevisionRef.current) setIsSubmitting(false);
    }
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
  const weightFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const totalRevenue = sales.reduce((total, sale) => total + sale.totalValue, 0);
  const totalWeight = sales.reduce((total, sale) => total + sale.weightKg, 0);
  const servedBuyers = new Set(sales.map((sale) => sale.buyerId)).size;
  const metricsUnavailable = isLoading || loadError !== null;
  const registrationUnavailable = metricsUnavailable || buyers.length === 0 || wasteRecords.length === 0;

  return (
    <section className="p-8">
      <PageHeader eyebrow={t("sales.eyebrow")} title={t("sales.title")} description={t("sales.description")} />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard title={t("sales.completedSales")} value={metricsUnavailable ? "—" : String(sales.length)} description={t("sales.operations")} badge={t("sales.realData")} />
        <MetricCard title={t("dashboard.revenue")} value={metricsUnavailable ? "—" : currencyFormatter.format(totalRevenue)} description={t("sales.realRevenueDescription")} badge={t("sales.realData")} />
        <MetricCard title={t("sales.soldMaterial")} value={metricsUnavailable ? "—" : `${weightFormatter.format(totalWeight)} ${t("common.kg")}`} description={t("sales.quantitySold")} badge={t("sales.realData")} />
        <MetricCard title={t("sales.servedBuyers")} value={metricsUnavailable ? "—" : String(servedBuyers)} description={t("sales.buyersWithSales")} badge={t("sales.realData")} />
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ecoplaza-text">{t("sales.records")}</h2>
              <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">{t("sales.realData")}</span>
            </div>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.realRecordsDescription")}</p>
          </div>
          <button
            type="button"
            disabled={registrationUnavailable}
            onClick={() => { setNotification(null); setIsModalOpen(true); }}
            className="shrink-0 rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            + {t("sales.registerButton")}
          </button>
        </div>

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
              <button type="button" onClick={() => void loadSalesData()} className="mt-4 flex items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary">
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("sales.retry")}
              </button>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5 text-center">
              <Database size={24} strokeWidth={1.8} className="text-ecoplaza-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("sales.emptyTitle")}</h3>
              <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">{t("sales.emptyDescription")}</p>
            </div>
          ) : (
            <SalesTable sales={sales} />
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
