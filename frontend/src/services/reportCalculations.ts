import {
  calculateSafeAverageMonetaryValue,
  calculateSafeAveragePricePerKg,
  sumSafeMonetaryValues,
} from "./monetarySafety.ts";
import { isValidReportDateRange, type ReportDateRange } from "./reportDateRange.ts";

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

export interface ReportMonthlySalesItem {
  month: string;
  salesCount: number;
  grossSalesValue: number;
  averageSaleValue: number;
}

export function getHighestRevenueDay(
  salesTrend: ReadonlyArray<ReportSalesTrendItem>,
): ReportSalesTrendItem | null {
  if (salesTrend.length === 0) return null;

  let highest: ReportSalesTrendItem | null = null;
  for (const item of salesTrend) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      !Number.isSafeInteger(item.salesCount) ||
      item.salesCount < 0 ||
      !Number.isFinite(item.grossSalesValue) ||
      item.grossSalesValue < 0
    ) {
      return null;
    }
    if (
      highest === null ||
      item.grossSalesValue > highest.grossSalesValue ||
      (item.grossSalesValue === highest.grossSalesValue && item.date < highest.date)
    ) {
      highest = item;
    }
  }

  return highest;
}

export interface ReportSalesCategoryItem {
  category: ReportWasteCategory;
  salesCount: number;
  soldWeightKg: number;
  grossSalesValue: number;
  averagePricePerKg: number;
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
  monthlySales: ReportMonthlySalesItem[];
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

function toMonthOrdinal(month: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (match === null) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return Number.isSafeInteger(year) && year >= 0 && monthIndex >= 0 && monthIndex < 12
    ? year * 12 + monthIndex
    : null;
}

function fromMonthOrdinal(ordinal: number): string {
  const year = Math.floor(ordinal / 12);
  const month = String((ordinal % 12) + 1).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${month}`;
}

export function calculateMonthlySales(
  salesTrend: ReadonlyArray<ReportSalesTrendItem>,
  dateRange?: ReportDateRange,
): ReportMonthlySalesItem[] | null {
  if (dateRange !== undefined && !isValidReportDateRange(dateRange)) return null;

  const buckets = new Map<string, { salesCount: number; revenues: number[] }>();
  for (const item of salesTrend) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      !Number.isSafeInteger(item.salesCount) ||
      item.salesCount < 0 ||
      !Number.isFinite(item.grossSalesValue) ||
      item.grossSalesValue < 0
    ) {
      return null;
    }
    const month = item.date.slice(0, 7);
    const bucket = buckets.get(month) ?? { salesCount: 0, revenues: [] };
    bucket.salesCount += item.salesCount;
    if (!Number.isSafeInteger(bucket.salesCount)) return null;
    bucket.revenues.push(item.grossSalesValue);
    buckets.set(month, bucket);
  }

  const populatedMonths = Array.from(buckets.keys()).sort();
  if (dateRange === undefined && populatedMonths.length === 0) return [];
  const startMonth = dateRange?.startDate.slice(0, 7) ?? populatedMonths[0];
  const endMonth = dateRange?.endDate.slice(0, 7) ?? populatedMonths.at(-1);
  const startOrdinal = toMonthOrdinal(startMonth);
  const endOrdinal = endMonth === undefined ? null : toMonthOrdinal(endMonth);
  if (startOrdinal === null || endOrdinal === null || startOrdinal > endOrdinal) return null;

  const summary: ReportMonthlySalesItem[] = [];
  for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
    const month = fromMonthOrdinal(ordinal);
    const bucket = buckets.get(month);
    const salesCount = bucket?.salesCount ?? 0;
    const grossSalesValue = sumSafeMonetaryValues(bucket?.revenues ?? []);
    if (grossSalesValue === null) return null;
    const averageSaleValue = calculateSafeAverageMonetaryValue(grossSalesValue, salesCount);
    if (averageSaleValue === null) return null;
    summary.push({ month, salesCount, grossSalesValue, averageSaleValue });
  }
  return summary;
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
    const averagePricePerKg = calculateSafeAveragePricePerKg(grossSalesValue, soldWeightKg);
    if (averagePricePerKg === null) return null;
    performance.push({
      category,
      salesCount: categorySales.length,
      soldWeightKg,
      grossSalesValue,
      averagePricePerKg,
    });
  }

  return performance;
}

export function calculateReportStatistics(
  wasteRecords: ReadonlyArray<ReportWasteInput>,
  sales: ReadonlyArray<ReportSaleInput>,
  dateRange?: ReportDateRange,
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
  const monthlySales = salesTrend === null ? null : calculateMonthlySales(salesTrend, dateRange);

  if (
    totalRegisteredWeightKg === null ||
    availableWeightKg === null ||
    soldWeightKg === null ||
    grossSalesValue === null ||
    salesByCategory === null ||
    salesTrend === null ||
    monthlySales === null
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
    monthlySales,
  };
}
