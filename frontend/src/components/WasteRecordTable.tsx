import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface WasteRecord {
  id: string;
  category: string;
  weight?: string | number;
  weightKg?: number;
  container?: string;
  containerCode?: string;
  containerId?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  notes?: string;
}

interface WasteRecordTableProps {
  records: WasteRecord[];
  isLoading?: boolean;
}

function WasteRecordTable({ records, isLoading = false }: WasteRecordTableProps) {
  const { t } = useTranslation();

  const translateCategory = (value: string) =>
    value === "organic" || value === "Orgánicos"
      ? t("common.organic", "Orgánicos")
      : value === "recyclable" || value === "Reciclables"
        ? t("common.recyclable", "Reciclables")
        : value === "nonRecyclable" || value === "No aprovechables" || value === "No reciclables"
          ? t("common.nonRecyclable", "No reciclable")
          : value;

  const translateStatus = (value: string) =>
    value === "available" || value === "Disponible"
      ? t("common.available", "Disponible")
      : value === "registered" || value === "Registrado"
        ? t("common.registered", "Registrado")
        : value === "sold"
          ? t("common.sold", "Vendido")
        : value;

  const translateContainer = (value: string) =>
    value === "container01"
      ? `${t("waste.container", "Contenedor")} 01`
      : value === "container02"
        ? `${t("waste.container", "Contenedor")} 02`
        : value === "container03"
          ? `${t("waste.container", "Contenedor")} 03`
          : value.replace(/^Contenedor\b/, t("waste.container", "Contenedor"));

  const formatWeight = (value?: string | number) => {
    if (value === undefined || value === null) return "-";
    return typeof value === "number" ? `${value} ${t("common.kg", "kg")}` : value;
  };

  const getCategoryBadgeClass = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized === "organic" || normalized === "orgánicos" || normalized === "organicos") {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    }
    if (normalized === "recyclable" || normalized === "reciclables") {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
    }
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <caption className="sr-only">
          {t("waste.recentRecords", "Historial de residuos")}
        </caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("waste.record", "Registro")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.category", "Categoría")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("sensors.registeredWeight", "Peso registrado")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("waste.container", "Contenedor")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.date", "Fecha")}
            </th>
            <th scope="col" className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              {t("common.status", "Estado")}
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted">
                <div className="flex items-center justify-center gap-2" role="status">
                  <LoaderCircle className="h-5 w-5 animate-spin text-ecoplaza-primary" aria-hidden="true" />
                  <span>{t("waste.loading", "Cargando tus residuos...")}</span>
                </div>
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted"
              >
                {t("waste.noRecords", "No hay registros disponibles")}
              </td>
            </tr>
          ) : (
            records.map((record) => {
              const containerRaw = record.containerCode || record.container || "";
              const containerDisplay = containerRaw ? translateContainer(containerRaw) : "-";
              const weightDisplay = formatWeight(record.weight ?? record.weightKg);
              const dateDisplay = record.date || record.createdAt || "-";

              return (
                <tr key={record.id} className="border-t border-ecoplaza-border" title={record.notes}>
                  <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                    {record.id}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                        record.category,
                      )}`}
                    >
                      {translateCategory(record.category)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text">
                    {weightDisplay}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                    {containerDisplay}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                    {dateDisplay}
                  </td>

                  <td className="px-5 py-4">
                    {record.status ? (
                      <span className="inline-flex items-center rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                        {translateStatus(record.status)}
                      </span>
                    ) : (
                      <span className="text-sm text-ecoplaza-text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default WasteRecordTable;
