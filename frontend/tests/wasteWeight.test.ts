import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeWasteWeightKg,
  parseWasteWeightKg,
} from "../src/services/wasteWeight.ts";

test("parses positive waste weights with precision up to one gram", () => {
  assert.equal(parseWasteWeightKg("0.001"), 0.001);
  assert.equal(parseWasteWeightKg("12.345"), 12.345);
  assert.equal(parseWasteWeightKg(" 25.5 "), 25.5);
  assert.equal(parseWasteWeightKg("100"), 100);
});

test("rejects invalid, excessive, or silently lossy waste weights", () => {
  for (const value of [
    "",
    "0",
    "-1",
    "1.0001",
    "NaN",
    "Infinity",
    "1e3",
    "9007199254740.991",
    "9007199254740.992",
  ]) {
    assert.equal(parseWasteWeightKg(value), null, value);
  }
});

test("validates service weight values with the same gram precision policy", () => {
  assert.equal(isSafeWasteWeightKg(0.001), true);
  assert.equal(isSafeWasteWeightKg(12.345), true);
  assert.equal(isSafeWasteWeightKg(0), false);
  assert.equal(isSafeWasteWeightKg(-1), false);
  assert.equal(isSafeWasteWeightKg(Number.NaN), false);
  assert.equal(isSafeWasteWeightKg(Number.POSITIVE_INFINITY), false);
  assert.equal(isSafeWasteWeightKg(1.0001), false);
  assert.equal(isSafeWasteWeightKg(0.1 + 0.2), false);
});
