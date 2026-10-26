import { useTranslation } from "react-i18next";

export interface DemoBuyer {
  id: string;
  name: string;
  type: string;
  interest: string;
  contact: string;
  status: string;
}

export interface DemoBuyerTableProps {
  buyers: DemoBuyer[];
  testId?: string;
}

function DemoBuyerTable({
  buyers,
  testId = "demo-buyer-table",
}: DemoBuyerTableProps) {
  const { t } = useTranslation();

  const translateType = (value: string) =>
    value === "Empresa recicladora"
      ? t("buyers.recyclerCompany")
      : value === "Productor de compost"
        ? t("buyers.compostProducer")
        : value === "Comerciante"
          ? t("buyers.merchant")
          : value === "Asociación"
            ? t("buyers.association")
            : value;

  const translateCategory = (value: string) =>
    value === "Orgánicos" ? t("common.organic") : t("common.recyclable");

  const translateStatus = (value: string) =>
    value === "Activo" ? t("common.active") : t("common.interested");

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={t("buyers.demoTitle")}
      data-testid={testId}
      className="overflow-x-auto rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
    >
      <table className="w-full min-w-[700px]">
        <caption className="sr-only">{t("buyers.demoTitle")}</caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            {["code", "buyer", "type", "interest", "contact"].map((key) => (
              <th
                key={key}
                scope="col"
                className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
              >
                {t(`buyers.${key}`)}
              </th>
            ))}
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {buyers.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                role="status"
                className="px-5 py-10 text-center text-sm text-ecoplaza-text-muted"
              >
                {t("buyers.noDemoBuyers", t("buyers.noBuyers"))}
              </td>
            </tr>
          ) : (
            buyers.map((buyer) => (
              <tr key={buyer.id} className="border-t border-ecoplaza-border">
                <td className="px-5 py-4 font-mono text-xs font-medium text-ecoplaza-text">
                  {buyer.id}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                  {buyer.name}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {translateType(buyer.type)}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text">
                  {translateCategory(buyer.interest)}
                </td>
                <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                  {buyer.contact}
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                    {translateStatus(buyer.status)}
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

export default DemoBuyerTable;
