import { isTimestampInRange, type TimestampRange } from "./reportDateRange.ts";
import { isSafeWasteWeightKg } from "./wasteWeight.ts";

type SalesFilterRecord = {
  buyerId: string;
  soldAt: string;
};

type WasteFilterRecord = {
  status: "registered" | "available" | "sold";
  category: "organic" | "recyclable" | "nonRecyclable";
  containerId: string;
};

type WasteHistoryFilterRecord = WasteFilterRecord & {
  registeredAt: string;
};

export type WasteStatusFilter = WasteFilterRecord["status"] | "all";
export type WasteCategoryFilter = WasteFilterRecord["category"] | "all";

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
): T[] {
  return sales.filter((sale) =>
    (dateRange === undefined || isTimestampInRange(sale.soldAt, dateRange)) &&
    (buyerId === undefined || sale.buyerId === buyerId)
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
): T[] {
  return records.filter((record) =>
    (status === "all" || record.status === status) &&
    (category === "all" || record.category === category) &&
    (containerId === "all" || record.containerId === containerId) &&
    (dateRange === undefined || isTimestampInRange(record.registeredAt, dateRange))
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
