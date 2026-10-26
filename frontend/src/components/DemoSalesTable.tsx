import { useTranslation } from "react-i18next";

export interface DemoSale {
  id: string;
  buyer: string;
  material: string;
  quantity: number;
  total: number;
  date: string;
  status: string;
}

export interface DemoSalesTableProps {
  sales: DemoSale[];
  testId?: string;
}

function DemoSalesTable({
  sales,
  testId = "demo-sales-table",
}: DemoSalesTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  const translateCategory = (value: string) => {
    const lower = value.toLowerCase();
    if (lower === "orgánicos" || lower === "organicos" || lower === "organic") {
      return t("common.organic");
    }
    return t("common.recyclable");
  };

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={t("sales.demoTitle")}
      data-testid={testId}
      className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
    >
      <table className="w-full min-w-[850px]">
        <caption className="sr-only">{t("sales.demoTitle")}</caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("sales.sale")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("buyers.buyer")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.material")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.quantity")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("sales.total")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.date")}
            </th>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                role="status"
                className="px-5 py-10 text-center text-sm text-ecoplaza-text-muted"
              >
                {t("sales.noDemoSales", t("sales.noSales"))}
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="border-t border-ecoplaza-border">
                <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text">
                  {sale.id}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  {sale.buyer}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  {translateCategory(sale.material)}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  {sale.quantity} {t("common.kg")}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                  {currencyFormatter.format(sale.total)}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {sale.date}
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                    {t("common.completed")}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DemoSalesTable;
