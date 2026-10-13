import { useTranslation } from "react-i18next";

export interface InventoryItem {
  id: string;
  category: "organic" | "recyclable" | "nonRecyclable";
  weightKg: number;
  container: string;
  registeredAt: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

function InventoryTable({ items }: InventoryTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const translateCategory = (value: string) =>
    value === "organic"
      ? t("common.organic")
      : value === "recyclable"
        ? t("common.recyclable")
        : t("common.nonRecyclable");
  const formatWeight = (weightKg: number) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(weightKg)} ${t("common.kg")}`;
  const formatDate = (registeredAt: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(registeredAt));

  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("inventory.lot")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.category")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("inventory.weight")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("inventory.container")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.date")}
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {item.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {translateCategory(item.category)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {formatWeight(item.weightKg)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {item.container}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {formatDate(item.registeredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;
