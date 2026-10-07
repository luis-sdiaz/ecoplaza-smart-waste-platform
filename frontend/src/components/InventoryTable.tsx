interface InventoryItem {
  id: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

function InventoryTable({ items }: InventoryTableProps) {
  const { t } = useTranslation();
  const translateCategory = (value: string) =>
    value === "Orgánicos" ? t("common.organic") : value === "Reciclables" ? t("common.recyclable") : value;
  const translateStatus = (value: string) =>
    value === "Disponible" ? t("common.available") : value === "Reservado" ? t("common.reserved") : value;
  const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

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
              {t("common.quantity")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("inventory.pricePerKg")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("inventory.estimatedValue")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.status")}
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
                {item.quantity} kg
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {currencyFormatter.format(item.unitPrice)}
              </td>

              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {currencyFormatter.format(item.quantity * item.unitPrice)}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {translateStatus(item.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;
import { useTranslation } from "react-i18next";
