import { MAX_MONETARY_FRACTION_DIGITS, sumSafeMonetaryValues } from "./monetarySafety.ts";
import type { SaleHistoryItem } from "./salesService";
import { isSafeWasteWeightKg } from "./wasteWeight.ts";

export type SalesCategorySummary = {
  category: SaleHistoryItem["category"];
  saleCount: number;
  totalWeightKg: number;
  grossRevenue: number;
};

const SALES_CATEGORIES: ReadonlyArray<SaleHistoryItem["category"]> = [
  "organic",
  "recyclable",
  "nonRecyclable",
];

export function summarizeSalesByCategory(
  sales: ReadonlyArray<Pick<SaleHistoryItem, "category" | "weightKg" | "totalValue">>,
): SalesCategorySummary[] | null {
  const summaries = new Map(SALES_CATEGORIES.map((category) => [category, {
    category,
    saleCount: 0,
    totalWeightGrams: 0,
    values: [] as number[],
  }]));

  for (const sale of sales) {
    const summary = summaries.get(sale.category);
    if (summary === undefined || !isSafeWasteWeightKg(sale.weightKg)) return null;
    const nextWeightGrams = summary.totalWeightGrams + Math.round(sale.weightKg * 1000);
    if (!Number.isSafeInteger(nextWeightGrams)) return null;
    summary.saleCount += 1;
    summary.totalWeightGrams = nextWeightGrams;
    summary.values.push(sale.totalValue);
  }

  const result: SalesCategorySummary[] = [];
  for (const category of SALES_CATEGORIES) {
    const summary = summaries.get(category)!;
    const grossRevenue = sumSafeMonetaryValues(summary.values);
    if (grossRevenue === null) return null;
    result.push({
      category,
      saleCount: summary.saleCount,
      totalWeightKg: summary.totalWeightGrams / 1000,
      grossRevenue,
    });
  }
  return result;
}

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
