import assert from "node:assert/strict";
import test from "node:test";
import { filterSalesByAmount, parseSalesAmountRange } from "../src/services/salesAmountRange.ts";

const sales = [
  { id: "below", totalValue: 99.99 },
  { id: "minimum", totalValue: 100.25 },
  { id: "middle", totalValue: 150.5 },
  { id: "maximum", totalValue: 200.75 },
  { id: "above", totalValue: 201 },
];

test("parses optional decimal sales amount limits", () => {
  assert.deepEqual(parseSalesAmountRange("", ""), { valid: true, range: {} });
  assert.deepEqual(parseSalesAmountRange(" 100.25 ", "200.75"), {
    valid: true,
    range: { minimum: 100.25, maximum: 200.75 },
  });
  assert.deepEqual(parseSalesAmountRange("0", "0"), {
    valid: true,
    range: { minimum: 0, maximum: 0 },
  });
});

test("rejects negative, non-finite, malformed, and reversed sales amount limits", () => {
  for (const [minimum, maximum] of [["-1", ""], ["Infinity", ""], ["1e3", ""], ["200", "100"], [".", "2"]]) {
    assert.equal(parseSalesAmountRange(minimum, maximum).valid, false);
  }
});

test("filters sales with inclusive amount boundaries without mutating the source", () => {
  const filtered = filterSalesByAmount(sales, { minimum: 100.25, maximum: 200.75 });
  assert.deepEqual(filtered.map(({ id }) => id), ["minimum", "middle", "maximum"]);
  assert.deepEqual(sales.map(({ id }) => id), ["below", "minimum", "middle", "maximum", "above"]);
});

test("supports one-sided amount limits and empty results", () => {
  assert.deepEqual(filterSalesByAmount(sales, { minimum: 200.75 }).map(({ id }) => id), ["maximum", "above"]);
  assert.deepEqual(filterSalesByAmount(sales, { maximum: 99.99 }).map(({ id }) => id), ["below"]);
  assert.deepEqual(filterSalesByAmount(sales, { minimum: 500 }), []);
});
