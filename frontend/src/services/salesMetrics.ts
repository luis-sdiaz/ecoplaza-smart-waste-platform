import { MAX_MONETARY_FRACTION_DIGITS, sumSafeMonetaryValues } from "./monetarySafety.ts";
import type { SaleHistoryItem } from "./salesService";
import { isSafeWasteWeightKg } from "./wasteWeight.ts";

export function calculateAverageSellingPricePerKg(
  sales: ReadonlyArray<Pick<SaleHistoryItem, "weightKg" | "totalValue">>,
): number | null {
  if (sales.length === 0) return null;

  let totalWeightGrams = 0;
  for (const sale of sales) {
    if (!isSafeWasteWeightKg(sale.weightKg)) return null;
    totalWeightGrams += Math.round(sale.weightKg * 1000);
    if (!Number.isSafeInteger(totalWeightGrams)) return null;
  }
  if (totalWeightGrams <= 0) return null;

  const totalRevenue = sumSafeMonetaryValues(sales.map((sale) => sale.totalValue));
  if (totalRevenue === null) return null;

  const average = totalRevenue / (totalWeightGrams / 1000);
  if (!Number.isFinite(average) || average < 0) return null;
  return Number(average.toFixed(MAX_MONETARY_FRACTION_DIGITS));
}
