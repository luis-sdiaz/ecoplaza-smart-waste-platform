import {
  isTimestampInRange,
  isValidReportDateRange,
  toTimestampRange,
  type ReportDateRange,
} from "./reportDateRange.ts";

type BuyerPurchaseDateRecord = {
  soldAt: string;
};

export type BuyerPurchaseDateFilterResult<T> =
  | { valid: true; data: T[] }
  | { valid: false; data: [] };

export function filterBuyerPurchasesByDate<T extends BuyerPurchaseDateRecord>(
  sales: readonly T[],
  range: ReportDateRange,
): BuyerPurchaseDateFilterResult<T> {
  if (range.startDate === "" && range.endDate === "") {
    return { valid: true, data: [...sales] };
  }
  if (!isValidReportDateRange(range)) {
    return { valid: false, data: [] };
  }

  const timestampRange = toTimestampRange(range);
  return {
    valid: true,
    data: sales.filter((sale) => isTimestampInRange(sale.soldAt, timestampRange)),
  };
}
