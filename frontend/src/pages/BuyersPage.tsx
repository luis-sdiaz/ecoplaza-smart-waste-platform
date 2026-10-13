import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import BuyerFormModal from "../components/BuyerFormModal";
import BuyerTable from "../components/BuyerTable";
import DemoBuyerTable, { type DemoBuyer } from "../components/DemoBuyerTable";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SuccessToast from "../components/SuccessToast";
import {
  createBuyer,
  listBuyers,
  updateBuyer,
  type Buyer,
  type BuyerErrorCode,
  type BuyerInput,
} from "../services/buyerService";

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

function UserBuyersPage({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const requestRevisionRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const notificationSequenceRef = useRef(0);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<BuyerNotification | null>(null);

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
          <button
            type="button"
            disabled={isLoading || loadError !== null}
            onClick={openCreateForm}
            className="shrink-0 rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            + {t("buyers.registerButton")}
          </button>
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
          ) : (
            <BuyerTable buyers={buyers} onEdit={openEditForm} />
          )}
        </div>
      </div>

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
