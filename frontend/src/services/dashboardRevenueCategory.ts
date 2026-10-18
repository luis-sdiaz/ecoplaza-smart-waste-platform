import type { ReportSalesCategoryItem, ReportWasteCategory } from "./reportCalculations.ts";

export interface TopRevenueCategory {
  category: ReportWasteCategory;
  salesCount: number;
  soldWeightKg: number;
  grossSalesValue: number;
  revenuePercentage: number;
}

export function findTopRevenueCategory(
  salesByCategory: ReadonlyArray<ReportSalesCategoryItem>,
  totalGrossSalesValue?: number,
): TopRevenueCategory | null {
  if (!Array.isArray(salesByCategory) || salesByCategory.length === 0) {
    return null;
  }

  const validCategories = salesByCategory.filter((item) =>
    Number.isSafeInteger(item.salesCount) &&
    item.salesCount >= 0 &&
    Number.isFinite(item.soldWeightKg) &&
    item.soldWeightKg >= 0 &&
    Number.isFinite(item.grossSalesValue) &&
    item.grossSalesValue >= 0,
  );

  if (validCategories.length === 0) return null;

  const calculatedTotal = validCategories.reduce((sum, item) => sum + item.grossSalesValue, 0);
  const total = totalGrossSalesValue !== undefined && Number.isFinite(totalGrossSalesValue) && totalGrossSalesValue > 0
    ? totalGrossSalesValue
    : calculatedTotal;

  if (total <= 0) return null;

  const positiveRevenueCategories = validCategories.filter((item) => item.grossSalesValue > 0);
  if (positiveRevenueCategories.length === 0) return null;

  const sorted = [...positiveRevenueCategories].sort((left, right) =>
    right.grossSalesValue - left.grossSalesValue ||
    right.soldWeightKg - left.soldWeightKg ||
    right.salesCount - left.salesCount ||
    left.category.localeCompare(right.category),
  );

  const top = sorted[0];
  const revenuePercentage = (top.grossSalesValue / total) * 100;

  return {
    category: top.category,
    salesCount: top.salesCount,
    soldWeightKg: top.soldWeightKg,
    grossSalesValue: top.grossSalesValue,
    revenuePercentage,
  };
}

