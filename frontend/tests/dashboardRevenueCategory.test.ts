import assert from "node:assert/strict";
import test from "node:test";
import {
  findTopRevenueCategory,
} from "../src/services/dashboardRevenueCategory.ts";
import type { ReportSalesCategoryItem } from "../src/services/reportCalculations.ts";

test("returns null when no sales or revenue exist across categories", () => {
  assert.equal(findTopRevenueCategory([]), null);
  const zeroSales: ReportSalesCategoryItem[] = [
    { category: "organic", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
    { category: "recyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
    { category: "nonRecyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
  ];
  assert.equal(findTopRevenueCategory(zeroSales), null);
});

test("returns null for invalid, negative, or NaN values", () => {
  assert.equal(findTopRevenueCategory([
    { category: "organic", salesCount: -1, soldWeightKg: 10, grossSalesValue: 100, averagePricePerKg: 10 },
  ]), null);
  assert.equal(findTopRevenueCategory([
    { category: "organic", salesCount: 1, soldWeightKg: Number.NaN, grossSalesValue: 100, averagePricePerKg: 10 },
  ]), null);
});

test("identifies the single highest revenue category and computes participation percentage", () => {
  const items: ReportSalesCategoryItem[] = [
    { category: "organic", salesCount: 2, soldWeightKg: 50, grossSalesValue: 500, averagePricePerKg: 10 },
    { category: "recyclable", salesCount: 5, soldWeightKg: 120, grossSalesValue: 1500, averagePricePerKg: 12.5 },
    { category: "nonRecyclable", salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
  ];

  const top = findTopRevenueCategory(items, 2000);
  assert.deepEqual(top, {
    category: "recyclable",
    salesCount: 5,
    soldWeightKg: 120,
    grossSalesValue: 1500,
    revenuePercentage: 75,
  });
});

test("breaks revenue ties deterministically using sold weight, sales count, and category name", () => {
  // Tie broken by weight:
  const tieByWeight: ReportSalesCategoryItem[] = [
    { category: "organic", salesCount: 2, soldWeightKg: 60, grossSalesValue: 1000, averagePricePerKg: 16.6 },
    { category: "recyclable", salesCount: 4, soldWeightKg: 40, grossSalesValue: 1000, averagePricePerKg: 25 },
  ];
  assert.equal(findTopRevenueCategory(tieByWeight)?.category, "organic");

  // Tie broken by sales count when weight is also equal:
  const tieBySalesCount: ReportSalesCategoryItem[] = [
    { category: "organic", salesCount: 2, soldWeightKg: 50, grossSalesValue: 1000, averagePricePerKg: 20 },
    { category: "recyclable", salesCount: 5, soldWeightKg: 50, grossSalesValue: 1000, averagePricePerKg: 20 },
  ];
  assert.equal(findTopRevenueCategory(tieBySalesCount)?.category, "recyclable");

  // Tie broken by category alphabetical order when everything else is equal:
  const completeTie: ReportSalesCategoryItem[] = [
    { category: "recyclable", salesCount: 3, soldWeightKg: 50, grossSalesValue: 1000, averagePricePerKg: 20 },
    { category: "organic", salesCount: 3, soldWeightKg: 50, grossSalesValue: 1000, averagePricePerKg: 20 },
  ];
  // "organic" < "recyclable"
  assert.equal(findTopRevenueCategory(completeTie)?.category, "organic");
});

