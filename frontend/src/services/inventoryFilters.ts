export interface InventoryWeightRangeFilter {
  minWeightKg?: number | string | null;
  maxWeightKg?: number | string | null;
}

export function parseInventoryWeightLimit(
  value: number | string | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return undefined;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

export function isInvalidWeightRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): boolean {
  const minVal = parseInventoryWeightLimit(min);
  const maxVal = parseInventoryWeightLimit(max);
  return minVal !== undefined && maxVal !== undefined && minVal > maxVal;
}

export function filterInventoryByWeightRange<
  T extends { weightKg?: number; weight?: number; currentWeightKg?: number },
>(
  items: readonly T[],
  range: InventoryWeightRangeFilter = {},
): T[] {
  const min = parseInventoryWeightLimit(range.minWeightKg);
  const max = parseInventoryWeightLimit(range.maxWeightKg);

  if (min === undefined && max === undefined) {
    return items.slice();
  }

  if (min !== undefined && max !== undefined && min > max) {
    return [];
  }

  return items.filter((item) => {
    const rawWeight = item.weightKg ?? item.weight ?? item.currentWeightKg;
    if (typeof rawWeight !== "number" || !Number.isFinite(rawWeight)) {
      return false;
    }
    if (min !== undefined && rawWeight < min) {
      return false;
    }
    if (max !== undefined && rawWeight > max) {
      return false;
    }
    return true;
  });
}

