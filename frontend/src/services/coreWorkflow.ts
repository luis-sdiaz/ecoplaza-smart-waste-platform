import { isTimestampInRange, type TimestampRange } from "./reportDateRange.ts";
import { isSafeWasteWeightKg } from "./wasteWeight.ts";

type SalesFilterRecord = {
  id: string;
  buyerId: string;
  soldAt: string;
  category?: "organic" | "recyclable" | "nonRecyclable";
};

type SalesSortRecord = {
  id: string;
  soldAt: string;
  totalValue: number;
};

type ContainerSortRecord = {
  id: string;
  code: string;
  createdAt: string;
};

export type ContainerSortOption = "codeAsc" | "codeDesc" | "newest" | "oldest";

export type SalesSortOption = "newest" | "oldest" | "valueDesc" | "valueAsc";

function compareValues(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortContainers<T extends ContainerSortRecord>(
  containers: readonly T[],
  option: ContainerSortOption,
  locale: string,
): T[] {
  return [...containers].sort((left, right) => {
    const codeComparison = left.code.localeCompare(right.code, locale, {
      numeric: true,
      sensitivity: "base",
    });
    const dateComparison = compareValues(Date.parse(left.createdAt), Date.parse(right.createdAt));

    if (option === "codeAsc" && codeComparison !== 0) return codeComparison;
    if (option === "codeDesc" && codeComparison !== 0) return -codeComparison;
    if (option === "newest" && dateComparison !== 0) return -dateComparison;
    if (option === "oldest" && dateComparison !== 0) return dateComparison;
    return left.id.localeCompare(right.id);
  });
}

export function sortSalesHistory<T extends SalesSortRecord>(
  sales: readonly T[],
  option: SalesSortOption,
): T[] {
  return [...sales].sort((left, right) => {
    const leftDate = new Date(left.soldAt).getTime();
    const rightDate = new Date(right.soldAt).getTime();
    const dateComparison = compareValues(leftDate, rightDate);
    const valueComparison = compareValues(left.totalValue, right.totalValue);

    if (option === "newest" && dateComparison !== 0) return -dateComparison;
    if (option === "oldest" && dateComparison !== 0) return dateComparison;
    if (option === "valueDesc" && valueComparison !== 0) return -valueComparison;
    if (option === "valueAsc" && valueComparison !== 0) return valueComparison;
    if ((option === "valueDesc" || option === "valueAsc") && dateComparison !== 0) {
      return -dateComparison;
    }
    return left.id.localeCompare(right.id);
  });
}

type WasteFilterRecord = {
  status: "registered" | "available" | "sold";
  category: "organic" | "recyclable" | "nonRecyclable";
  containerId: string;
};

type WasteHistoryFilterRecord = WasteFilterRecord & {
  registeredAt: string;
  recordNumber?: string;
};

export type WasteStatusFilter = WasteFilterRecord["status"] | "all";
export type WasteCategoryFilter = WasteFilterRecord["category"] | "all";
export type InventorySortOption = "newest" | "oldest" | "weightDesc" | "weightAsc";

type InventorySortRecord = { id: string; registeredAt: string; weightKg: number };

export function sortAvailableInventory<T extends InventorySortRecord>(records: readonly T[], option: InventorySortOption): T[] {
  return [...records].sort((left, right) => {
    const dateComparison = compareValues(Date.parse(left.registeredAt), Date.parse(right.registeredAt));
    const weightComparison = compareValues(left.weightKg, right.weightKg);
    if (option === "newest" && dateComparison !== 0) return -dateComparison;
    if (option === "oldest" && dateComparison !== 0) return dateComparison;
    if (option === "weightDesc" && weightComparison !== 0) return -weightComparison;
    if (option === "weightAsc" && weightComparison !== 0) return weightComparison;
    if ((option === "weightDesc" || option === "weightAsc") && dateComparison !== 0) return -dateComparison;
    return left.id.localeCompare(right.id);
  });
}

type InventorySummaryContainer = {
  id: string;
  code: string;
};

type InventorySummaryRecord = WasteFilterRecord & {
  id: string;
  weightKg: number;
};

export type ContainerStockSummary = {
  containerId: string;
  containerCode: string;
  availableWeightKg: number;
  availableRecordCount: number;
};

export function summarizeAvailableStockByContainer(
  containers: readonly InventorySummaryContainer[],
  records: readonly InventorySummaryRecord[],
): ContainerStockSummary[] {
  const summaries = new Map<string, {
    containerCode: string;
    availableWeightGrams: number;
    availableRecordCount: number;
  }>();

  for (const container of containers) {
    if (!summaries.has(container.id)) {
      summaries.set(container.id, {
        containerCode: container.code,
        availableWeightGrams: 0,
        availableRecordCount: 0,
      });
    }
  }

  const countedRecordIds = new Set<string>();
  for (const record of records) {
    if (record.status !== "available" || countedRecordIds.has(record.id)) continue;

    const summary = summaries.get(record.containerId);
    if (summary === undefined || !isSafeWasteWeightKg(record.weightKg)) continue;

    const weightGrams = Math.round(record.weightKg * 1000);
    const nextWeightGrams = summary.availableWeightGrams + weightGrams;
    if (!Number.isSafeInteger(nextWeightGrams)) continue;

    countedRecordIds.add(record.id);
    summary.availableWeightGrams = nextWeightGrams;
    summary.availableRecordCount += 1;
  }

  return Array.from(summaries, ([containerId, summary]) => ({
    containerId,
    containerCode: summary.containerCode,
    availableWeightKg: summary.availableWeightGrams / 1000,
    availableRecordCount: summary.availableRecordCount,
  })).sort((left, right) =>
    right.availableWeightKg - left.availableWeightKg ||
    left.containerCode.localeCompare(right.containerCode) ||
    left.containerId.localeCompare(right.containerId)
  );
}

export function filterSalesHistory<T extends SalesFilterRecord>(
  sales: readonly T[],
  dateRange?: TimestampRange,
  buyerId?: string,
  category: WasteCategoryFilter = "all",
  saleSearch = "",
): T[] {
  const normalizedSearch = saleSearch.trim().toLocaleLowerCase();
  return sales.filter((sale) =>
    (dateRange === undefined || isTimestampInRange(sale.soldAt, dateRange)) &&
    (buyerId === undefined || sale.buyerId === buyerId) &&
    (category === "all" || sale.category === category) &&
    (normalizedSearch === "" || (() => {
      const normalizedId = sale.id.toLocaleLowerCase();
      const visibleId = `sal-${normalizedId.slice(0, 8)}`;
      return normalizedId.includes(normalizedSearch) || visibleId.includes(normalizedSearch);
    })())
  );
}

export function filterAvailableInventory<T extends WasteFilterRecord>(
  records: readonly T[],
  category: WasteCategoryFilter = "all",
  containerId = "all",
): T[] {
  return records.filter((record) =>
    record.status === "available" &&
    (category === "all" || record.category === category) &&
    (containerId === "all" || record.containerId === containerId)
  );
}

export function filterWasteHistory<T extends WasteHistoryFilterRecord>(
  records: readonly T[],
  status: WasteStatusFilter = "all",
  category: WasteCategoryFilter = "all",
  containerId = "all",
  dateRange?: TimestampRange,
  recordSearch = "",
): T[] {
  const normalizedSearch = recordSearch.replace(/\s+/g, "").toLocaleLowerCase();
  return records.filter((record) =>
    (status === "all" || record.status === status) &&
    (category === "all" || record.category === category) &&
    (containerId === "all" || record.containerId === containerId) &&
    (dateRange === undefined || isTimestampInRange(record.registeredAt, dateRange)) &&
    (normalizedSearch === "" || (() => {
      const recordNumber = record.recordNumber ?? "";
      const normalizedNumber = recordNumber.replace(/\s+/g, "").toLocaleLowerCase();
      const visibleNumber = `res-${recordNumber.padStart(3, "0")}`.toLocaleLowerCase();
      return normalizedNumber.includes(normalizedSearch) || visibleNumber.includes(normalizedSearch);
    })())
  );
}

export type PageResult<T, E> =
  | { ok: true; data: T[] }
  | { ok: false; error: E };

export async function collectPaginatedData<T, E>(
  pageSize: number,
  loadPage: (from: number, to: number) => Promise<PageResult<T, E>>,
): Promise<PageResult<T, E>> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error("Page size must be a positive integer.");
  }

  const rows: T[] = [];
  for (let page = 0; ; page += 1) {
    const from = page * pageSize;
    const result = await loadPage(from, from + pageSize - 1);
    if (!result.ok) return result;

    rows.push(...result.data);
    if (result.data.length < pageSize) return { ok: true, data: rows };
  }
}

export class RequestRevisionTracker {
  private currentRevision = 0;

  issue(): number {
    this.currentRevision += 1;
    return this.currentRevision;
  }

  invalidate(): void {
    this.currentRevision += 1;
  }

  isCurrent(revision: number): boolean {
    return revision === this.currentRevision;
  }
}
