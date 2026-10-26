import { LoaderCircle, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { calculateStorageAgeDays } from "../services/inventoryAge";

export interface InventoryItem {
  id: string;
  category: "organic" | "recyclable" | "nonRecyclable" | string;
  categoryName?: string;
  weightKg?: number;
  weight?: number | string;
  container?: string;
  registeredAt?: string;
  updatedAt?: string;
  percentage?: number;
  fillPercentage?: number;
  maxCapacityKg?: number;
  status?: string;
}

export interface InventoryTableProps {
  items: InventoryItem[];
  isLoading?: boolean;
}

function InventoryTable({ items, isLoading = false }: InventoryTableProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language || "es";
  const locale = currentLang.startsWith("en") ? "en-US" : "es-CO";

  const getCategoryLabel = (item: InventoryItem): string => {
    if (item.categoryName) return item.categoryName;
    if (item.category === "organic") return t("common.organic", "Orgánicos");
    if (item.category === "recyclable") return t("common.recyclable", "Reciclables");
    if (item.category === "nonRecyclable") return t("common.nonRecyclable", "No aprovechables");
    return String(item.category);
  };

  const getCategoryBadgeClass = (category: string): string => {
    if (category === "organic") {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    }
    if (category === "recyclable") {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
    }
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
  };

  const getWeightValue = (item: InventoryItem): number => {
    if (typeof item.weightKg === "number") return item.weightKg;
    if (typeof item.weight === "number") return item.weight;
    if (typeof item.weight === "string") {
      const parsed = parseFloat(item.weight);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatWeight = (weight: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(weight) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(weight);
    return `${formatted} ${t("common.kg", "kg")}`;
  };

  const formatPercentage = (val: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(val);
    return `${formatted}%`;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStatusLabel = (status: string): string => {
    if (status === "optimal") return t("inventory.statusOptimal", "Óptimo");
    if (status === "warning") return t("inventory.statusWarning", "Advertencia");
    if (status === "low") return t("inventory.statusLow", "Bajo");
    return status;
  };

  const getStatusBadgeClass = (status: string): string => {
    if (status === "optimal") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    }
    if (status === "warning") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    }
    if (status === "low") {
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    }
    return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime())
      ? t("inventory.invalidDate", "Fecha inválida")
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  };

  const getStorageAgeText = (days: number): string => {
    const translation = t("inventory.storageAgeDays", {
      count: days,
      defaultValue: days === 1 ? "1 día" : `${days} días`,
    });
    if (typeof translation === "string") return translation;
    return days === 1 ? "1 día" : `${days} días`;
  };

  const now = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <caption className="sr-only">
          {t("inventory.tableCaption", "Inventario disponible y stock en bodega")}
        </caption>
        <thead className="bg-ecoplaza-background">
          <tr>
            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("inventory.lot", "Registro")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.category", "Categoría")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("inventory.weight", "Peso")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("inventory.capacity", "Capacidad")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("inventory.container", "Contenedor")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("common.date", "Fecha")}
            </th>

            <th
              scope="col"
              className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted"
            >
              {t("inventory.storageAge", "Antigüedad")}
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted"
              >
                <div
                  className="flex items-center justify-center gap-2 text-ecoplaza-text-muted"
                  role="status"
                  aria-live="polite"
                >
                  <LoaderCircle
                    className="animate-spin text-ecoplaza-primary"
                    size={20}
                    aria-hidden="true"
                  />
                  <span>
                    {t("inventory.loading", "Cargando el inventario disponible...")}
                  </span>
                </div>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-12 text-center text-sm text-ecoplaza-text-muted"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Package
                    size={32}
                    className="text-ecoplaza-text-muted opacity-50"
                    aria-hidden="true"
                  />
                  <p className="font-medium text-ecoplaza-text">
                    {t("inventory.noItems", "No hay inventario disponible")}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const weightVal = getWeightValue(item);
              const percentage = item.percentage ?? item.fillPercentage;
              const dateStr = item.registeredAt ?? item.updatedAt;
              const storageAgeDays = dateStr
                ? calculateStorageAgeDays(dateStr, now)
                : null;

              return (
                <tr
                  key={item.id}
                  className="border-t border-ecoplaza-border transition-colors hover:bg-ecoplaza-background/50"
                >
                  <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                    {item.id}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                        item.category,
                      )}`}
                    >
                      {getCategoryLabel(item)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                    {formatWeight(weightVal)}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text">
                    {typeof percentage === "number" ? (
                      <div className="flex items-center gap-2.5">
                        <div
                          role="progressbar"
                          aria-valuenow={Math.round(percentage)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t("inventory.capacity", "Capacidad")}: ${formatPercentage(percentage)}`}
                          className="h-2 w-16 overflow-hidden rounded-full bg-ecoplaza-border"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                              percentage,
                            )}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, percentage))}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-ecoplaza-text">
                          {formatPercentage(percentage)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-ecoplaza-text-muted">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text">
                    {item.container ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                    {formatDate(dateStr)}
                  </td>

                  <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                    <div className="flex flex-col gap-1">
                      <span>
                        {storageAgeDays === null
                          ? t("inventory.ageUnavailable", "No disponible")
                          : getStorageAgeText(storageAgeDays)}
                      </span>
                      {item.status && (
                        <span
                          className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      )}
                    </div>
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

export default InventoryTable;
