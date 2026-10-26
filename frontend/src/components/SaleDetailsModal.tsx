import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { SaleHistoryItem } from "../services/salesService";
import { useDialogFocus } from "../hooks/useDialogFocus";

export interface SaleDetailsModalProps {
  sale: (SaleHistoryItem & {
    weight?: number;
    pricePerKg?: number;
    totalAmount?: number;
    createdAt?: string;
    notes?: string;
  }) | null;
  onClose: () => void;
}

function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const dialogRef = useDialogFocus(onClose);

  if (!sale) {
    return null;
  }

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });

  const weightKg = sale.weightKg ?? sale.weight ?? 0;
  const unitPrice = sale.unitPrice ?? sale.pricePerKg ?? 0;
  const totalValue = sale.totalValue ?? sale.totalAmount ?? (weightKg * unitPrice);

  const rawDate = sale.soldAt ?? sale.createdAt;
  const formattedDate = rawDate && !isNaN(new Date(rawDate).getTime())
    ? dateFormatter.format(new Date(rawDate))
    : "—";

  const category = sale.category ?? "recyclable";
  const categoryLabel = t(`common.${category}`, category === "recyclable" ? "Reciclable" : String(category));
  const recordSuffix = sale.wasteRecordNumber ? ` · RES-${String(sale.wasteRecordNumber).padStart(3, "0")}` : "";

  const notesText = sale.notes?.trim() ? sale.notes.trim() : t("sales.noNotes", "Sin notas registradas");

  const fields = [
    { label: t("sales.detailReference", "Referencia real"), value: sale.id, mono: true, colSpan: false },
    { label: t("sales.detailDate", "Fecha de realización"), value: formattedDate, colSpan: false },
    { label: t("sales.detailBuyer", "Comprador"), value: sale.buyerName || "—", colSpan: false },
    {
      label: t("sales.detailMaterial", "Material"),
      value: `${categoryLabel}${recordSuffix}`,
      colSpan: false,
    },
    {
      label: t("sales.detailWeight", "Peso vendido"),
      value: `${numberFormatter.format(weightKg)} ${t("common.kg", "kg")}`,
      colSpan: false,
    },
    { label: t("sales.detailUnitPrice", "Precio por kilogramo"), value: currencyFormatter.format(unitPrice), colSpan: false },
    { label: t("sales.detailTotal", "Valor total"), value: currencyFormatter.format(totalValue), colSpan: false },
    { label: t("sales.detailNotes", "Notas"), value: notesText, colSpan: true },
  ];

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-details-title"
    >
      <section className="w-full max-w-2xl rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ecoplaza-border p-5">
          <div>
            <h2 id="sale-details-title" className="text-lg font-semibold text-ecoplaza-text">
              {t("sales.detailsTitle", "Detalle de la venta")}
            </h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">
              {t("sales.detailsDescription", "Información de solo consulta guardada para esta venta completada.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("sales.closeDetails", "Cerrar")}
            className="rounded-lg p-2 text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className={`rounded-xl border border-ecoplaza-border bg-ecoplaza-background/55 p-4 ${
                field.colSpan ? "sm:col-span-2" : ""
              }`}
            >
              <dt className="text-xs font-medium text-ecoplaza-text-muted">{field.label}</dt>
              <dd className={`mt-1 break-words text-sm font-semibold text-ecoplaza-text ${field.mono ? "font-mono" : ""}`}>
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default SaleDetailsModal;
