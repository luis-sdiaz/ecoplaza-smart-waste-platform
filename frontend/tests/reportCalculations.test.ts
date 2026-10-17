import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateReportStatistics,
  calculateSalesTrend,
  getHighestRevenueDay,
  type ReportSaleInput,
  type ReportWasteInput,
} from "../src/services/reportCalculations.ts";

process.env.TZ = "America/Bogota";

const wasteRecords: ReportWasteInput[] = [
  { id: "waste-1", category: "organic", weightKg: 10, status: "available" },
  { id: "waste-2", category: "recyclable", weightKg: 20, status: "sold" },
  { id: "waste-3", category: "nonRecyclable", weightKg: 5, status: "registered" },
];

const sales: ReportSaleInput[] = [
  {
    id: "sale-1", wasteRecordId: "waste-2", category: "recyclable", weightKg: 20,
    totalValue: 1000.25, soldAt: "2026-10-13T05:00:00.000Z",
  },
  {
    id: "sale-2", wasteRecordId: "waste-3", category: "nonRecyclable", weightKg: 5,
    totalValue: 2000.5, soldAt: "2026-10-14T04:59:59.999Z",
  },
];

test("calculates historical, available, sold, revenue, and category values", () => {
  const result = calculateReportStatistics(wasteRecords, sales);
  assert.notEqual(result, null);
  assert.equal(result?.wasteRecordCount, 3);
  assert.equal(result?.totalRegisteredWeightKg, 35);
  assert.equal(result?.availableWeightKg, 10);
  assert.equal(result?.soldWeightKg, 25);
  assert.equal(result?.salesCount, 2);
  assert.equal(result?.grossSalesValue, 3000.75);
  assert.deepEqual(result?.distribution.map(({ category, weightKg }) => ({ category, weightKg })), [
    { category: "organic", weightKg: 10 },
    { category: "recyclable", weightKg: 20 },
    { category: "nonRecyclable", weightKg: 5 },
  ]);
  assert.equal(result?.distribution.reduce((sum, item) => sum + item.percentage, 0), 100);
  assert.deepEqual(result?.salesByCategory, [
    { category: "organic", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
    { category: "recyclable", salesCount: 1, soldWeightKg: 20, grossSalesValue: 1000.25, averagePricePerKg: 50.0125 },
    { category: "nonRecyclable", salesCount: 1, soldWeightKg: 5, grossSalesValue: 2000.5, averagePricePerKg: 400.1 },
  ]);
});

test("uses sale categories even when their waste records are outside the report period", () => {
  const result = calculateReportStatistics([], [sales[0]]);

  assert.deepEqual(result?.salesByCategory, [
    { category: "organic", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
    { category: "recyclable", salesCount: 1, soldWeightKg: 20, grossSalesValue: 1000.25, averagePricePerKg: 50.0125 },
    { category: "nonRecyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
  ]);
});

test("groups sales by their real local completion date without rounding revenue", () => {
  assert.deepEqual(calculateSalesTrend(sales), [
    { date: "2026-10-13", salesCount: 2, grossSalesValue: 3000.75 },
  ]);
});

test("sums fractional database totals without binary accumulation drift", () => {
  assert.deepEqual(calculateSalesTrend([
    { soldAt: "2026-10-13T05:00:00.000Z", totalValue: 0.1 },
    { soldAt: "2026-10-13T06:00:00.000Z", totalValue: 0.2 },
  ]), [
    { date: "2026-10-13", salesCount: 2, grossSalesValue: 0.3 },
  ]);
});

test("selects the highest revenue day with an earliest-date tie breaker", () => {
  const trend = [
    { date: "2026-10-15", salesCount: 3, grossSalesValue: 5000 },
    { date: "2026-10-13", salesCount: 2, grossSalesValue: 5000 },
    { date: "2026-10-14", salesCount: 4, grossSalesValue: 4000 },
  ];
  assert.deepEqual(getHighestRevenueDay(trend), trend[1]);
  assert.equal(getHighestRevenueDay([]), null);
  assert.equal(getHighestRevenueDay([{ date: "invalid", salesCount: 1, grossSalesValue: 10 }]), null);
});

test("returns valid zero statistics for an interval without records", () => {
  assert.deepEqual(calculateReportStatistics([], []), {
    wasteRecordCount: 0,
    totalRegisteredWeightKg: 0,
    availableWeightKg: 0,
    soldWeightKg: 0,
    salesCount: 0,
    grossSalesValue: 0,
    distribution: [
      { category: "organic", weightKg: 0, percentage: 0 },
      { category: "recyclable", weightKg: 0, percentage: 0 },
      { category: "nonRecyclable", weightKg: 0, percentage: 0 },
    ],
    salesByCategory: [
      { category: "organic", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
      { category: "recyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
      { category: "nonRecyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
    ],
    salesTrend: [],
  });
});

test("rejects duplicate records and invalid numeric or date values", () => {
  assert.equal(calculateReportStatistics([...wasteRecords, wasteRecords[0]], sales), null);
  assert.equal(calculateReportStatistics(wasteRecords, [...sales, { ...sales[1], id: "sale-3" }]), null);
  assert.equal(calculateReportStatistics([{ ...wasteRecords[0], weightKg: Number.NaN }], []), null);
  assert.equal(calculateSalesTrend([{ soldAt: "invalid", totalValue: 10 }]), null);
  assert.equal(calculateSalesTrend([{
    soldAt: "2026-10-13T05:00:00.000Z",
    totalValue: Number("90071992547.40992"),
  }]), null);
});
