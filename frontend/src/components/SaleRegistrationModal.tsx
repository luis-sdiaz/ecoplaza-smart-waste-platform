import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { Buyer } from "../services/buyerService";
import type { Container } from "../services/containerService";
import { parseUnitPrice } from "../services/salesService";
import {
  calculateSafeEstimatedTotal,
  MAX_MONETARY_FRACTION_DIGITS,
} from "../services/monetarySafety";
import type { RemoteWasteRecord } from "../services/wasteService";
import { useDialogFocus } from "../hooks/useDialogFocus";

export type SaleRegistrationValues = {
  buyerId: string;
  wasteRecordId: string;
  weightKg: number;
  unitPrice: number;
};

export interface SaleRegistrationModalProps {
  buyers: Buyer[];
  wasteRecords?: RemoteWasteRecord[];
  containers?: Container[];
  stock?: Record<string, number>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: SaleRegistrationValues) => void;
}

type SaleFormErrors = {
  buyer: boolean;
  wasteRecord: boolean;
  weight: boolean;
  unitPrice: boolean;
};

const emptyErrors: SaleFormErrors = {
  buyer: false,
  wasteRecord: false,
  weight: false,
  unitPrice: false,
};

function SaleRegistrationModal({
  buyers,
  wasteRecords = [],
  containers = [],
  stock,
  isSubmitting,
  onClose,
  onSubmit,
}: SaleRegistrationModalProps) {
  const { t, i18n } = useTranslation();

  // Derivación resiliente de lotes disponibles si se provee stock en lugar de wasteRecords
  const effectiveWasteRecords: RemoteWasteRecord[] =
    wasteRecords.length > 0
      ? wasteRecords
      : stock
        ? Object.entries(stock).map(([category, weightKg], index) => ({
            id: `stock-${category}`,
            recordNumber: String(index + 1),
            category: category as RemoteWasteRecord["category"],
            weightKg,
            containerId: `cont-${category}`,
            status: "available" as const,
            registeredAt: new Date().toISOString(),
          }))
        : [];

  const [buyerId, setBuyerId] = useState("");
  const [wasteRecordId, setWasteRecordId] = useState(
    () => effectiveWasteRecords[0]?.id ?? "",
  );

  const selectedWasteRecord =
    effectiveWasteRecords.find((record) => record.id === wasteRecordId) ??
    effectiveWasteRecords[0] ??
    null;

  const maxAvailableStock =
    selectedWasteRecord?.weightKg ??
    (stock ? Math.max(...Object.values(stock), 0) : 0);

  const [weightInput, setWeightInput] = useState(() =>
    selectedWasteRecord ? String(selectedWasteRecord.weightKg) : "",
  );
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [errors, setErrors] = useState<SaleFormErrors>(emptyErrors);
  const dialogRef = useDialogFocus(onClose, !isSubmitting);
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  const parsedWeight = parseFloat(weightInput);
  const isWeightValid =
    !isNaN(parsedWeight) &&
    parsedWeight > 0 &&
    (maxAvailableStock === 0 || parsedWeight <= maxAvailableStock);

  const unitPrice = parseUnitPrice(unitPriceInput);
  const previewTotal =
    isWeightValid && unitPrice !== null
      ? calculateSafeEstimatedTotal(parsedWeight, unitPrice)
      : null;

  const hasUnsafeTotal =
    isWeightValid && unitPrice !== null && previewTotal === null;

  const containerCodes = new Map(
    containers.map((container) => [container.id, container.code]),
  );

  const isUnavailable =
    buyers.length === 0 || effectiveWasteRecords.length === 0;

  const formatWeight = (value: number): string =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${t("common.kg")}`;

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
    }).format(value);

  const translateCategory = (category: RemoteWasteRecord["category"]): string =>
    category === "organic"
      ? t("common.organic")
      : category === "recyclable"
        ? t("common.recyclable")
        : t("common.nonRecyclable");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const currentWasteRecord =
      effectiveWasteRecords.find((record) => record.id === wasteRecordId) ??
      effectiveWasteRecords[0] ??
      null;

    const nextErrors: SaleFormErrors = {
      buyer: !buyers.some((buyer) => buyer.id === buyerId),
      wasteRecord: currentWasteRecord === null,
      weight: !isWeightValid,
      unitPrice: unitPrice === null || hasUnsafeTotal,
    };

    setErrors(nextErrors);

    if (
      nextErrors.buyer ||
      nextErrors.wasteRecord ||
      nextErrors.weight ||
      nextErrors.unitPrice ||
      currentWasteRecord === null ||
      unitPrice === null ||
      !isWeightValid ||
      isSubmitting
    ) {
      return;
    }

    onSubmit({
      buyerId,
      wasteRecordId: currentWasteRecord.id,
      weightKg: parsedWeight,
      unitPrice,
    });
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-registration-title"
        className="max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2
            id="sale-registration-title"
            className="text-lg font-semibold text-ecoplaza-text"
          >
            {t("sales.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          {t("sales.modalDescription")}
        </p>

        {isUnavailable && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted"
          >
            {t(buyers.length === 0 ? "sales.noBuyers" : "sales.noAvailableWaste")}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="sale-buyer"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("sales.buyerField")}
            </label>
            <select
              id="sale-buyer"
              value={buyerId}
              disabled={isSubmitting || buyers.length === 0}
              onChange={(event) => {
                setBuyerId(event.target.value);
                if (errors.buyer) {
                  setErrors((current) => ({ ...current, buyer: false }));
                }
              }}
              aria-invalid={errors.buyer}
              aria-describedby={errors.buyer ? "sale-buyer-error" : undefined}
              className={fieldClassName(errors.buyer)}
            >
              <option value="">{t("sales.selectBuyer")}</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
            {errors.buyer && (
              <p
                id="sale-buyer-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("sales.selectBuyerError")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="sale-waste-record"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("sales.wasteRecordField")}
            </label>
            <select
              id="sale-waste-record"
              value={wasteRecordId}
              disabled={isSubmitting || effectiveWasteRecords.length === 0}
              onChange={(event) => {
                const nextId = event.target.value;
                setWasteRecordId(nextId);
                const record = effectiveWasteRecords.find((r) => r.id === nextId);
                if (record) {
                  setWeightInput(String(record.weightKg));
                }
                if (errors.wasteRecord) {
                  setErrors((current) => ({ ...current, wasteRecord: false }));
                }
              }}
              aria-invalid={errors.wasteRecord}
              aria-describedby={
                errors.wasteRecord ? "sale-waste-record-error" : undefined
              }
              className={fieldClassName(errors.wasteRecord)}
            >
              <option value="">{t("sales.selectWasteRecord")}</option>
              {effectiveWasteRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {`RES-${record.recordNumber.padStart(3, "0")} · ${translateCategory(record.category)} · ${formatWeight(record.weightKg)}`}
                </option>
              ))}
            </select>
            {errors.wasteRecord && (
              <p
                id="sale-waste-record-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("sales.selectWasteRecordError")}
              </p>
            )}
          </div>

          {selectedWasteRecord && (
            <dl className="grid grid-cols-3 gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-background/60 p-4">
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">
                  {t("common.category")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">
                  {translateCategory(selectedWasteRecord.category)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">
                  {t("inventory.container")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">
                  {containerCodes.get(selectedWasteRecord.containerId) ??
                    t("inventory.unknownContainer")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ecoplaza-text-muted">
                  {t("sales.fullWeight")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ecoplaza-text">
                  {formatWeight(selectedWasteRecord.weightKg)}
                </dd>
              </div>
            </dl>
          )}

          <div>
            <label
              htmlFor="sale-weight"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("sales.soldWeight")} ({t("common.kg")})
            </label>
            <input
              id="sale-weight"
              type="number"
              min="0.001"
              max={maxAvailableStock > 0 ? maxAvailableStock : undefined}
              step="0.001"
              placeholder="0.00"
              inputMode="decimal"
              value={weightInput}
              disabled={isSubmitting}
              onChange={(event) => {
                setWeightInput(event.target.value);
                if (errors.weight) {
                  setErrors((current) => ({ ...current, weight: false }));
                }
              }}
              aria-invalid={errors.weight}
              aria-describedby={
                errors.weight ? "sale-weight-error" : undefined
              }
              className={fieldClassName(errors.weight)}
            />
            {errors.weight && (
              <p
                id="sale-weight-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("waste.invalidWeight")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="sale-unit-price"
              className="block text-sm font-medium text-ecoplaza-text"
            >
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
              aria-describedby={
                errors.unitPrice
                  ? "sale-unit-price-error"
                  : "sale-unit-price-help"
              }
              className={fieldClassName(errors.unitPrice)}
            />
            {errors.unitPrice ? (
              <p
                id="sale-unit-price-error"
                role="alert"
                className="mt-1.5 text-sm text-ecoplaza-danger"
              >
                {t("sales.invalidUnitPrice")}
              </p>
            ) : (
              <p
                id="sale-unit-price-help"
                className="mt-1.5 text-xs text-ecoplaza-text-muted"
              >
                {t("sales.unitPriceHelp")}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-ecoplaza-primary/10 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-ecoplaza-text-muted">
                {t("sales.estimatedTotal")}
              </span>
              <span className="text-base font-semibold text-ecoplaza-text">
                {previewTotal !== null ? formatCurrency(previewTotal) : "—"}
              </span>
            </div>
            <p className="mt-1 text-xs text-ecoplaza-text-muted">
              {t("sales.databaseTotalNotice")}
            </p>
            {hasUnsafeTotal && (
              <p role="alert" className="mt-1 text-xs text-ecoplaza-danger">
                {t("sales.unsafeEstimatedTotal")}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("sales.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUnavailable}
              aria-busy={isSubmitting}
              className="rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-medium text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
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
