import { useTranslation } from "react-i18next";

export interface DemoBuyer {
  id: string;
  name: string;
  type: string;
  interest: string;
  contact: string;
  status: string;
}

function DemoBuyerTable({ buyers }: { buyers: DemoBuyer[] }) {
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
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            {["code", "buyer", "type", "interest", "contact"].map((key) => (
              <th key={key} className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
                {t(`buyers.${key}`)}
              </th>
            ))}
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {buyers.map((buyer) => (
            <tr key={buyer.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">{buyer.id}</td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text">{buyer.name}</td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">{translateType(buyer.type)}</td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text">{translateCategory(buyer.interest)}</td>
              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">{buyer.contact}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {translateStatus(buyer.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DemoBuyerTable;
