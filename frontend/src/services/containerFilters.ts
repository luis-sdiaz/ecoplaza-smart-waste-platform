export type ContainerStockFilter = "all" | "with_stock" | "empty";

export type Container = {
  id: string;
  code: string;
  createdAt?: string;
  category?: string | null;
  wasteType?: string | null;
  location?: string | null;
  description?: string | null;
  currentWeightKg?: number | null;
  availableWeightKg?: number | null;
};

export type FilterContainersOptions = {
  query?: string;
  stockFilter?: ContainerStockFilter;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function filterContainers(
  containers: readonly Container[],
  options: FilterContainersOptions = {},
): Container[] {
  const rawQuery = options.query?.trim() ?? "";
  const normalizedQuery = rawQuery !== "" ? normalizeText(rawQuery) : "";
  const stockFilter = options.stockFilter ?? "all";

  return containers.filter((container) => {
    // 1. Filtro textual
    if (normalizedQuery !== "") {
      const codeMatch = normalizeText(container.code).includes(normalizedQuery);
      const categoryMatch = container.category ? normalizeText(container.category).includes(normalizedQuery) : false;
      const wasteTypeMatch = container.wasteType ? normalizeText(container.wasteType).includes(normalizedQuery) : false;
      const locationMatch = container.location ? normalizeText(container.location).includes(normalizedQuery) : false;
      const descriptionMatch = container.description ? normalizeText(container.description).includes(normalizedQuery) : false;

      if (!codeMatch && !categoryMatch && !wasteTypeMatch && !locationMatch && !descriptionMatch) {
        return false;
      }
    }

    // 2. Filtro de stock
    if (stockFilter !== "all") {
      const weight = container.currentWeightKg ?? container.availableWeightKg ?? 0;
      const hasStock = typeof weight === "number" && !Number.isNaN(weight) && weight > 0;

      if (stockFilter === "with_stock" && !hasStock) {
        return false;
      }
      if (stockFilter === "empty" && hasStock) {
        return false;
      }
    }

    return true;
  });
}

