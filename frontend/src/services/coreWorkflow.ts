import { isTimestampInRange, type TimestampRange } from "./reportDateRange.ts";

type SalesFilterRecord = {
  buyerId: string;
  soldAt: string;
};

type WasteFilterRecord = {
  status: "registered" | "available" | "sold";
  category: "organic" | "recyclable" | "nonRecyclable";
  containerId: string;
};

export type WasteStatusFilter = WasteFilterRecord["status"] | "all";
export type WasteCategoryFilter = WasteFilterRecord["category"] | "all";

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

export function filterWasteHistory<T extends WasteFilterRecord>(
  records: readonly T[],
  status: WasteStatusFilter = "all",
  category: WasteCategoryFilter = "all",
): T[] {
  return records.filter((record) =>
    (status === "all" || record.status === status) &&
    (category === "all" || record.category === category)
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
