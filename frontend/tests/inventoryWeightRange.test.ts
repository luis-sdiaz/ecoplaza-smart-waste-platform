import assert from "node:assert/strict";
import test from "node:test";
import {
  filterInventoryByWeightRange,
  isInvalidWeightRange,
  parseInventoryWeightLimit,
} from "../src/services/inventoryFilters.ts";

const sampleInventory = [
  { id: "item-1", weightKg: 5 },
  { id: "item-2", weightKg: 10.5 },
  { id: "item-3", weight: 20 },
  { id: "item-4", currentWeightKg: 25.75 },
  { id: "item-5", weightKg: 50 },
];

test("parses and sanitizes weight limits properly", () => {
  assert.equal(parseInventoryWeightLimit(""), undefined);
  assert.equal(parseInventoryWeightLimit("   "), undefined);
  assert.equal(parseInventoryWeightLimit(null), undefined);
  assert.equal(parseInventoryWeightLimit(undefined), undefined);
  assert.equal(parseInventoryWeightLimit("12.5"), 12.5);
  assert.equal(parseInventoryWeightLimit(" 20 "), 20);
  assert.equal(parseInventoryWeightLimit(15.75), 15.75);
  assert.equal(parseInventoryWeightLimit(0), 0);
  assert.equal(parseInventoryWeightLimit("0"), 0);
  assert.equal(parseInventoryWeightLimit(-5), -5);
  assert.equal(parseInventoryWeightLimit("abc"), undefined);
  assert.equal(parseInventoryWeightLimit(NaN), undefined);
});

test("detects invalid / inverted weight ranges", () => {
  assert.equal(isInvalidWeightRange(30, 10), true);
  assert.equal(isInvalidWeightRange("25.5", "10"), true);
  assert.equal(isInvalidWeightRange(10, 30), false);
  assert.equal(isInvalidWeightRange("10", "10"), false);
  assert.equal(isInvalidWeightRange(undefined, 30), false);
  assert.equal(isInvalidWeightRange(10, null), false);
});

test("filters inventory with inclusive boundaries on both limits", () => {
  const result = filterInventoryByWeightRange(sampleInventory, {
    minWeightKg: 10.5,
    maxWeightKg: 25.75,
  });
  assert.deepEqual(result.map((item) => item.id), ["item-2", "item-3", "item-4"]);

  const stringResult = filterInventoryByWeightRange(sampleInventory, {
    minWeightKg: " 10.5 ",
    maxWeightKg: " 25.75 ",
  });
  assert.deepEqual(stringResult.map((item) => item.id), ["item-2", "item-3", "item-4"]);

  const minOnly = filterInventoryByWeightRange(sampleInventory, { minWeightKg: 20 });
  assert.deepEqual(minOnly.map((item) => item.id), ["item-3", "item-4", "item-5"]);

  const maxOnly = filterInventoryByWeightRange(sampleInventory, { maxWeightKg: 10.5 });
  assert.deepEqual(maxOnly.map((item) => item.id), ["item-1", "item-2"]);
});

test("rejects reversed ranges by returning an empty array", () => {
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: 50, maxWeightKg: 10 }),
    [],
  );
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: "30", maxWeightKg: "20" }),
    [],
  );
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: 10, maxWeightKg: -5 }),
    [],
  );
});

test("handles empty strings, null values, and negative numbers safely without breaking execution", () => {
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: "", maxWeightKg: "" }),
    sampleInventory,
  );
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: "   ", maxWeightKg: null }),
    sampleInventory,
  );
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, { minWeightKg: null, maxWeightKg: null }),
    sampleInventory,
  );
  assert.deepEqual(
    filterInventoryByWeightRange(sampleInventory, {}),
    sampleInventory,
  );

  // Safe handling of negative numbers
  const negativeMin = filterInventoryByWeightRange(sampleInventory, {
    minWeightKg: -10,
    maxWeightKg: 15,
  });
  assert.deepEqual(negativeMin.map((item) => item.id), ["item-1", "item-2"]);

  const negativeMax = filterInventoryByWeightRange(sampleInventory, {
    maxWeightKg: -5,
  });
  assert.deepEqual(negativeMax, []);

  // Safe handling of NaN and invalid inputs
  const nanLimits = filterInventoryByWeightRange(sampleInventory, {
    minWeightKg: "invalid-text",
    maxWeightKg: NaN,
  });
  assert.deepEqual(nanLimits, sampleInventory);
});

test("preserves input collection immutability", () => {
  const frozen = Object.freeze([
    Object.freeze({ id: "frozen-1", weightKg: 10 }),
    Object.freeze({ id: "frozen-2", weightKg: 20 }),
  ]);

  const filtered = filterInventoryByWeightRange(frozen, { minWeightKg: 15 });
  assert.notEqual(filtered, frozen);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "frozen-2");
  assert.equal(frozen.length, 2);
});

