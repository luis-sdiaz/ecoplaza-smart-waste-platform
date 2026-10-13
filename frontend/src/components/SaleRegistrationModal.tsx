import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Buyer } from "../services/buyerService";
import type { Container } from "../services/containerService";
import { parseUnitPrice } from "../services/salesService";
import type { RemoteWasteRecord } from "../services/wasteService";

export type SaleRegistrationValues = {
  buyerId: string;
  wasteRecordId: string;
  unitPrice: number;
};

interface SaleRegistrationModalProps {
  buyers: Buyer[];
  wasteRecords: RemoteWasteRecord[];
  containers: Container[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: SaleRegistrationValues) => void;
}

type SaleFormErrors = {
  buyer: boolean;
  wasteRecord: boolean;
  unitPrice: boolean;
};

const emptyErrors: SaleFormErrors = {
  buyer: false,
  wasteRecord: false,
  unitPrice: false,
};

function SaleRegistrationModal({
  buyers,
  wasteRecords,
  containers,
  isSubmitting,
  onClose,
  onSubmit,
}: SaleRegistrationModalProps) {
  const { t, i18n } = useTranslation();
  const [buyerId, setBuyerId] = useState("");
  const [wasteRecordId, setWasteRecordId] = useState("");
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [errors, setErrors] = useState<SaleFormErrors>(emptyErrors);
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const selectedWasteRecord = wasteRecords.find((record) => record.id === wasteRecordId) ?? null;
  const unitPrice = parseUnitPrice(unitPriceInput);
  const previewTotal = selectedWasteRecord && unitPrice !== null
    ? selectedWasteRecord.weightKg * unitPrice
    : null;
  const containerCodes = new Map(containers.map((container) => [container.id, container.code]));
  const isUnavailable = buyers.length === 0 || wasteRecords.length === 0;
  const formatWeight = (value: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${t("common.kg")}`;
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 2,
    }).format(value);
  const translateCategory = (category: RemoteWasteRecord["category"]): string =>
    category === "organic"
      ? t("common.organic")
      : category === "recyclable"
        ? t("common.recyclable")
        : t("common.nonRecyclable");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const nextErrors: SaleFormErrors = {
      buyer: !buyers.some((buyer) => buyer.id === buyerId),
      wasteRecord: !wasteRecords.some((record) => record.id === wasteRecordId),
      unitPrice: unitPrice === null,
    };
    setErrors(nextErrors);

    if (
      nextErrors.buyer ||
      nextErrors.wasteRecord ||
      nextErrors.unitPrice ||
      unitPrice === null ||
      isSubmitting
    ) {
      return;
    }

    onSubmit({ buyerId, wasteRecordId, unitPrice });
  };

  const fieldClassName = (hasError: boolean): string =>
    `mt-2 w-full rounded-xl border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
      hasError
        ? "border-ecoplaza-danger focus-visible:outline-ecoplaza-danger"
        : "border-ecoplaza-border focus-visible:outline-ecoplaza-accent"
    }`;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/25 p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-registration-title"
        className="max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-xl"
      >
        <h2 id="sale-registration-title" className="text-lg font-semibold text-ecoplaza-text">
          {t("sales.modalTitle")}
        </h2>
        <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.modalDescription")}</p>

        {isUnavailable && (
          <div role="status" className="mt-4 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted">
            {t(buyers.length === 0 ? "sales.noBuyers" : "sales.noAvailableWaste")}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="sale-buyer" className="block text-sm font-medium text-ecoplaza-text">
              {t("sales.buyerField")}
            </label>
            <select
              id="sale-buyer"
              value={buyerId}
              disabled={isSubmitting || buyers.length === 0}
              onChange={(event) => {
                setBuyerId(event.target.value);
                if (errors.buyer) setErrors((current) => ({ ...current, buyer: false }));
              }}
              aria-invalid={errors.buyer}
              aria-describedby={errors.buyer ? "sale-buyer-error" : undefined}
              className={fieldClassName(errors.buyer)}
            >
              <option value="">{t("sales.selectBuyer")}</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
              ))}
            </select>
            {errors.buyer && (
              <p id="sale-buyer-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("sales.selectBuyerError")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="sale-waste-record" className="block text-sm font-medium text-ecoplaza-text">
              {t("sales.wasteRecordField")}
            </label>
            <select
              id="sale-waste-record"
              value={wasteRecordId}
              disabled={isSubmitting || wasteRecords.length === 0}
              onChange={(event) => {
                setWasteRecordId(event.target.value);
                if (errors.wasteRecord) {
                  setErrors((current) => ({ ...current, wasteRecord: false }));
                }
              }}
              aria-invalid={errors.wasteRecord}
              aria-describedby={errors.wasteRecord ? "sale-waste-record-error" : undefined}
              className={fieldClassName(errors.wasteRecord)}
            >
              <option value="">{t("sales.selectWasteRecord")}</option>
              {wasteRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {`RES-${record.recordNumber.padStart(3, "0")} · ${translateCategory(record.category)} · ${formatWeight(record.weightKg)}`}
                </option>
              ))}
            </select>
            {errors.wasteRecord && (
              <p id="sale-waste-record-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("sales.selectWasteRecordError")}
              </p>
            )}
          </div>

          {selectedWasteRecord && (
            <dl className="grid grid-cols-3 gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-4">
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">{t("common.category")}</dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">{translateCategory(selectedWasteRecord.category)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">{t("inventory.container")}</dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">
                  {containerCodes.get(selectedWasteRecord.containerId) ?? t("inventory.unknownContainer")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">{t("sales.fullWeight")}</dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">{formatWeight(selectedWasteRecord.weightKg)}</dd>
              </div>
            </dl>
          )}

          <div>
            <label htmlFor="sale-unit-price" className="block text-sm font-medium text-ecoplaza-text">
              {t("sales.unitPriceField")}
            </label>
            <input
              id="sale-unit-price"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={16}
              value={unitPriceInput}
              disabled={isSubmitting}
              onChange={(event) => {
                setUnitPriceInput(event.target.value);
                if (errors.unitPrice) {
                  setErrors((current) => ({ ...current, unitPrice: false }));
                }
              }}
              placeholder={t("sales.unitPricePlaceholder")}
              aria-invalid={errors.unitPrice}
              aria-describedby={errors.unitPrice ? "sale-unit-price-error" : "sale-unit-price-help"}
              className={fieldClassName(errors.unitPrice)}
            />
            {errors.unitPrice ? (
              <p id="sale-unit-price-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("sales.invalidUnitPrice")}
              </p>
            ) : (
              <p id="sale-unit-price-help" className="mt-1.5 text-xs text-ecoplaza-text-muted">
                {t("sales.unitPriceHelp")}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-ecoplaza-primary/10 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-ecoplaza-text-muted">{t("sales.estimatedTotal")}</span>
              <span className="text-base font-semibold text-ecoplaza-text">
                {previewTotal !== null && Number.isFinite(previewTotal) ? formatCurrency(previewTotal) : "—"}
              </span>
            </div>
            <p className="mt-1 text-xs text-ecoplaza-text-muted">{t("sales.databaseTotalNotice")}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("sales.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUnavailable}
              aria-busy={isSubmitting}
              className="rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t(isSubmitting ? "sales.confirming" : "sales.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaleRegistrationModal;
