import assert from "node:assert/strict";
import test from "node:test";
import { filterBuyerPurchasesByDate } from "../src/services/buyerPurchaseFilters.ts";

process.env.TZ = "America/Bogota";

const sales = [
  { id: "start", soldAt: "2026-10-10T05:00:00.000Z" },
  { id: "middle", soldAt: "2026-10-10T18:00:00.000Z" },
  { id: "end", soldAt: "2026-10-11T04:59:59.999Z" },
  { id: "outside", soldAt: "2026-10-11T05:00:00.000Z" },
];

test("filters buyer purchases with inclusive local calendar-day boundaries", () => {
  const result = filterBuyerPurchasesByDate(sales, { startDate: "2026-10-10", endDate: "2026-10-10" });
  assert.equal(result.valid, true);
  assert.deepEqual(result.data.map(({ id }) => id), ["start", "middle", "end"]);
});

test("rejects incomplete, reversed, and impossible buyer purchase ranges", () => {
  assert.equal(filterBuyerPurchasesByDate(sales, { startDate: "2026-10-10", endDate: "" }).valid, false);
  assert.equal(filterBuyerPurchasesByDate(sales, { startDate: "2026-10-11", endDate: "2026-10-10" }).valid, false);
  assert.equal(filterBuyerPurchasesByDate(sales, { startDate: "2026-02-30", endDate: "2026-03-01" }).valid, false);
});

test("returns a new unfiltered array when both buyer purchase dates are empty", () => {
  const result = filterBuyerPurchasesByDate(sales, { startDate: "", endDate: "" });
  assert.equal(result.valid, true);
  assert.deepEqual(result.data, sales);
  assert.notEqual(result.data, sales);
});

test("returns a valid empty set when no purchases match the date range", () => {
  const result = filterBuyerPurchasesByDate(sales, { startDate: "2026-09-01", endDate: "2026-09-30" });
  assert.deepEqual(result, { valid: true, data: [] });
});
