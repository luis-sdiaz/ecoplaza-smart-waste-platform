import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSafeAveragePricePerKg,
  calculateSafeEstimatedTotal,
  isSafeUnitPrice,
  parseSafeSaleTotal,
  parseUnitPrice,
  sumSafeMonetaryValues,
} from "../src/services/monetarySafety.ts";

test("parses positive unit prices as safe integer cents", () => {
  assert.equal(parseUnitPrice("2500"), 2500);
  assert.equal(parseUnitPrice("2500,25"), 2500.25);
  assert.equal(parseUnitPrice("9999999999999.99"), 9999999999999.99);
  assert.equal(isSafeUnitPrice(2500.25), true);

  for (const value of ["", "0", "-1", "1.001", "1e3", "10000000000000"]) {
    assert.equal(parseUnitPrice(value), null, value);
  }
  assert.equal(isSafeUnitPrice(Number.POSITIVE_INFINITY), false);
});

test("calculates sale estimates with exact scaled gram and cent arithmetic", () => {
  assert.equal(calculateSafeEstimatedTotal(12.345, 2500.25), 30865.58625);
  assert.equal(calculateSafeEstimatedTotal(1.0001, 2500), null);
  assert.equal(calculateSafeEstimatedTotal(1_000_000, 9_999_999_999.99), null);
});

test("accepts definitive database totals only within the safe five-decimal scale", () => {
  assert.equal(parseSafeSaleTotal("30865.58625"), 30865.58625);
  assert.equal(parseSafeSaleTotal("30865.5862500"), 30865.58625);
  assert.equal(parseSafeSaleTotal("0.00001"), 0.00001);
  assert.equal(parseSafeSaleTotal("0.000001"), null);
  assert.equal(parseSafeSaleTotal("90071992547.40992"), null);
  assert.equal(parseSafeSaleTotal(Number.NaN), null);
});

test("sums monetary values without floating-point accumulation errors", () => {
  assert.equal(sumSafeMonetaryValues([0.1, 0.2, 1000.12345]), 1000.42345);
  assert.equal(sumSafeMonetaryValues([]), 0);
  assert.equal(sumSafeMonetaryValues([Number.NaN]), null);
  assert.equal(sumSafeMonetaryValues([90_071_992_547.40991, 0.00001]), null);
});

test("calculates safe average prices per kilogram without invalid divisions", () => {
  assert.equal(calculateSafeAveragePricePerKg(1000.25, 20), 50.0125);
  assert.equal(calculateSafeAveragePricePerKg(1, 3), 0.33333);
  assert.equal(calculateSafeAveragePricePerKg(0, 0), 0);
  assert.equal(calculateSafeAveragePricePerKg(1, 0), null);
  assert.equal(calculateSafeAveragePricePerKg(Number.NaN, 1), null);
  assert.equal(calculateSafeAveragePricePerKg(1, Number.POSITIVE_INFINITY), null);
});
