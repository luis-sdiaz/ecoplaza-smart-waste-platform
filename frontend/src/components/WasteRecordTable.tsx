interface WasteRecord {
  id: string;
  category: string;
  weight: string;
  container: string;
  date: string;
  status: string;
}

interface WasteRecordTableProps {
  records: WasteRecord[];
}

function WasteRecordTable({ records }: WasteRecordTableProps) {
  const { t } = useTranslation();
  const translateCategory = (value: string) =>
    value === "Orgánicos"
      ? t("common.organic")
      : value === "Reciclables"
        ? t("common.recyclable")
        : value === "No aprovechables"
          ? t("common.nonRecyclable")
          : value;
  const translateStatus = (value: string) =>
    value === "Disponible"
      ? t("common.available")
      : value === "Registrado"
        ? t("common.registered")
        : value;
  const translateContainer = (value: string) =>
    value.replace(/^Contenedor\b/, t("waste.container"));
  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("waste.record")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.category")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sensors.registeredWeight")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("waste.container")}
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
          {records.map((record) => (
            <tr key={record.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {record.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {translateCategory(record.category)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {record.weight}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {translateContainer(record.container)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {record.date}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {translateStatus(record.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WasteRecordTable;
import { useTranslation } from "react-i18next";
