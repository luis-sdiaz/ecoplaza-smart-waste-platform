interface Sale {
  id: string;
  buyer: string;
  material: string;
  quantity: number;
  total: number;
  date: string;
  status: string;
}

interface SalesTableProps {
  sales: Sale[];
}

function SalesTable({ sales }: SalesTableProps) {
  const { t } = useTranslation();
  const translateCategory = (value: string) =>
    value === "Orgánicos" ? t("common.organic") : value === "Reciclables" ? t("common.recyclable") : value;
  const translateStatus = (value: string) =>
    value === "Completada" ? t("common.completed") : value;
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
              {t("sales.sale")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("buyers.buyer")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.material")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.quantity")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sales.total")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.date")}
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.status")}
            </th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {sale.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {sale.buyer}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {translateCategory(sale.material)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {sale.quantity} kg
              </td>

              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {currencyFormatter.format(sale.total)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {sale.date}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {translateStatus(sale.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesTable;
import { useTranslation } from "react-i18next";
