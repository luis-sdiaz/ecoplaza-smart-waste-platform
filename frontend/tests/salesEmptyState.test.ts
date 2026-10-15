import assert from "node:assert/strict";
import test from "node:test";
import { getSalesEmptyState } from "../src/services/salesEmptyState.ts";

test("selects the sales empty state for every filter combination", () => {
  assert.deepEqual(getSalesEmptyState(false, false), {
    titleKey: "sales.emptyTitle",
    descriptionKey: "sales.emptyDescription",
  });
  assert.deepEqual(getSalesEmptyState(true, false), {
    titleKey: "sales.emptyBuyerTitle",
    descriptionKey: "sales.emptyBuyerDescription",
  });
  assert.deepEqual(getSalesEmptyState(false, true), {
    titleKey: "sales.emptyPeriodTitle",
    descriptionKey: "sales.emptyPeriodDescription",
  });
  assert.deepEqual(getSalesEmptyState(true, true), {
    titleKey: "sales.emptyBuyerPeriodTitle",
    descriptionKey: "sales.emptyBuyerPeriodDescription",
  });
});
