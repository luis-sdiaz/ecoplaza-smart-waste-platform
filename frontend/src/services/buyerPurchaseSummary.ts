import { sumSafeMonetaryValues } from "./monetarySafety.ts";
import type { SaleHistoryItem } from "./salesService";
import { isSafeWasteWeightKg } from "./wasteWeight.ts";

export type BuyerPurchaseSummary = {
  purchaseCount: number;
  totalWeightKg: number;
  totalValue: number;
};

export function summarizeBuyerPurchases(
  sales: ReadonlyArray<SaleHistoryItem>,
): BuyerPurchaseSummary | null {
  let totalWeightGrams = 0;

  for (const sale of sales) {
    if (!isSafeWasteWeightKg(sale.weightKg)) return null;
    totalWeightGrams += Math.round(sale.weightKg * 1000);
    if (!Number.isSafeInteger(totalWeightGrams)) return null;
  }

  const totalValue = sumSafeMonetaryValues(sales.map((sale) => sale.totalValue));
  if (totalValue === null) return null;

  return {
    purchaseCount: sales.length,
    totalWeightKg: totalWeightGrams / 1000,
    totalValue,
  };
}
