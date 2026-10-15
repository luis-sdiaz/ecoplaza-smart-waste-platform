import { sumSafeMonetaryValues } from "./monetarySafety.ts";

export type ReportWasteCategory = "organic" | "recyclable" | "nonRecyclable";

export interface ReportCategoryDistributionItem {
  category: ReportWasteCategory;
  weightKg: number;
  percentage: number;
}

export interface ReportSalesTrendItem {
  date: string;
  salesCount: number;
  grossSalesValue: number;
}

export interface ReportSalesCategoryItem {
  category: ReportWasteCategory;
  salesCount: number;
  soldWeightKg: number;
  grossSalesValue: number;
}

export interface ReportStatistics {
  wasteRecordCount: number;
  totalRegisteredWeightKg: number;
  availableWeightKg: number;
  soldWeightKg: number;
  salesCount: number;
  grossSalesValue: number;
  distribution: ReportCategoryDistributionItem[];
  salesByCategory: ReportSalesCategoryItem[];
  salesTrend: ReportSalesTrendItem[];
}

export interface ReportWasteInput {
  id: string;
  category: ReportWasteCategory;
  weightKg: number;
  status: "available" | "registered" | "sold";
}

export interface ReportSaleInput {
  id: string;
  wasteRecordId: string;
  category: ReportWasteCategory;
  weightKg: number;
  totalValue: number;
  soldAt: string;
}

const REPORT_CATEGORIES: ReportWasteCategory[] = [
  "organic",
  "recyclable",
  "nonRecyclable",
];

function sumSafely(values: ReadonlyArray<number>): number | null {
  let sum = 0;
  let correction = 0;

  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return null;

    const adjustedValue = value - correction;
    const nextSum = sum + adjustedValue;
    correction = nextSum - sum - adjustedValue;
    sum = nextSum;

    if (!Number.isFinite(sum)) return null;
  }

  return sum;
}

function hasDuplicateValues(values: ReadonlyArray<string>): boolean {
  return new Set(values).size !== values.length;
}

function toLocalDateKey(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateSalesTrend(
  sales: ReadonlyArray<Pick<ReportSaleInput, "soldAt" | "totalValue">>,
): ReportSalesTrendItem[] | null {
  const buckets = new Map<string, number[]>();

  for (const sale of sales) {
    const date = toLocalDateKey(sale.soldAt);
    if (date === null || !Number.isFinite(sale.totalValue) || sale.totalValue < 0) {
      return null;
    }
    const values = buckets.get(date) ?? [];
    values.push(sale.totalValue);
    buckets.set(date, values);
  }

  const trend: ReportSalesTrendItem[] = [];
  const sortedBuckets = Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [date, values] of sortedBuckets) {
    const grossSalesValue = sumSafeMonetaryValues(values);
    if (grossSalesValue === null) return null;
    trend.push({ date, salesCount: values.length, grossSalesValue });
  }

  return trend;
}

export function calculateSalesByCategory(
  sales: ReadonlyArray<Pick<ReportSaleInput, "category" | "weightKg" | "totalValue">>,
): ReportSalesCategoryItem[] | null {
  if (sales.some((sale) => !REPORT_CATEGORIES.includes(sale.category))) return null;

  const performance: ReportSalesCategoryItem[] = [];

  for (const category of REPORT_CATEGORIES) {
    const categorySales = sales.filter((sale) => sale.category === category);
    const soldWeightKg = sumSafely(categorySales.map((sale) => sale.weightKg));
    const grossSalesValue = sumSafeMonetaryValues(
      categorySales.map((sale) => sale.totalValue),
    );

    if (soldWeightKg === null || grossSalesValue === null) return null;
    performance.push({
      category,
      salesCount: categorySales.length,
      soldWeightKg,
      grossSalesValue,
    });
  }

  return performance;
}

export function calculateReportStatistics(
  wasteRecords: ReadonlyArray<ReportWasteInput>,
  sales: ReadonlyArray<ReportSaleInput>,
): ReportStatistics | null {
  if (
    hasDuplicateValues(wasteRecords.map((record) => record.id)) ||
    hasDuplicateValues(sales.map((sale) => sale.id)) ||
    hasDuplicateValues(sales.map((sale) => sale.wasteRecordId))
  ) {
    return null;
  }

  const totalRegisteredWeightKg = sumSafely(wasteRecords.map((record) => record.weightKg));
  const availableWeightKg = sumSafely(
    wasteRecords
      .filter((record) => record.status === "available")
      .map((record) => record.weightKg),
  );
  const soldWeightKg = sumSafely(sales.map((sale) => sale.weightKg));
  const grossSalesValue = sumSafeMonetaryValues(sales.map((sale) => sale.totalValue));
  const salesByCategory = calculateSalesByCategory(sales);
  const salesTrend = calculateSalesTrend(sales);

  if (
    totalRegisteredWeightKg === null ||
    availableWeightKg === null ||
    soldWeightKg === null ||
    grossSalesValue === null ||
    salesByCategory === null ||
    salesTrend === null
  ) {
    return null;
  }

  const distribution = REPORT_CATEGORIES.map((category) => {
    const weightKg = sumSafely(
      wasteRecords
        .filter((record) => record.category === category)
        .map((record) => record.weightKg),
    );
    if (weightKg === null) return null;
    return {
      category,
      weightKg,
      percentage: totalRegisteredWeightKg > 0
        ? (weightKg / totalRegisteredWeightKg) * 100
        : 0,
    };
  });

  if (distribution.some((item) => item === null)) return null;

  return {
    wasteRecordCount: wasteRecords.length,
    totalRegisteredWeightKg,
    availableWeightKg,
    soldWeightKg,
    salesCount: sales.length,
    grossSalesValue,
    distribution: distribution as ReportCategoryDistributionItem[],
    salesByCategory,
    salesTrend,
  };
}
