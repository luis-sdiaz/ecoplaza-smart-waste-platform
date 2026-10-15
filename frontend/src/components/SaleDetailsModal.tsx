import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";
import type { SaleHistoryItem } from "../services/salesService";

interface SaleDetailsModalProps {
  sale: SaleHistoryItem;
  onClose: () => void;
}

function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  const { t, i18n } = useTranslation();
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

  const fields = [
    { label: t("sales.detailReference"), value: sale.id, mono: true },
    { label: t("sales.detailDate"), value: dateFormatter.format(new Date(sale.soldAt)) },
    { label: t("sales.detailBuyer"), value: sale.buyerName },
    {
      label: t("sales.detailMaterial"),
      value: `${t(`common.${sale.category}`)} · RES-${sale.wasteRecordNumber.padStart(3, "0")}`,
    },
    {
      label: t("sales.detailWeight"),
      value: `${numberFormatter.format(sale.weightKg)} ${t("common.kg")}`,
    },
    { label: t("sales.detailUnitPrice"), value: currencyFormatter.format(sale.unitPrice) },
    { label: t("sales.detailTotal"), value: currencyFormatter.format(sale.totalValue) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="sale-details-title">
      <section className="w-full max-w-2xl rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ecoplaza-border p-5">
          <div>
            <h2 id="sale-details-title" className="text-lg font-semibold text-ecoplaza-text">{t("sales.detailsTitle")}</h2>
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{t("sales.detailsDescription")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("sales.closeDetails")} className="rounded-lg p-2 text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/55 p-4 sm:last:col-span-2">
              <dt className="text-xs font-medium text-ecoplaza-text-muted">{field.label}</dt>
              <dd className={`mt-1 break-words text-sm font-semibold text-ecoplaza-text ${field.mono ? "font-mono" : ""}`}>{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default SaleDetailsModal;
