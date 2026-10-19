import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortBuyers } from "../src/services/buyerFilters.ts";

const base = {
  email: null,
  phone: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const buyers = [
  { ...base, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Alfa", purchaseCount: 3 },
  { ...base, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Beta", purchaseCount: 0 },
  { ...base, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Gamma", purchaseCount: 1 },
  { ...base, id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Delta" },
];

test('activity filter "all" returns every buyer', () => {
  const result = filterAndSortBuyers(buyers, "", "name_asc", "es-CO", "all", "all");
  assert.equal(result.length, 4);
});

test('activity filter "with_purchases" returns only buyers with purchaseCount > 0', () => {
  const result = filterAndSortBuyers(buyers, "", "name_asc", "es-CO", "all", "with_purchases");
  const names = result.map((b) => b.name);
  assert.deepEqual(names, ["Alfa", "Gamma"]);
  assert.ok(result.every((b) => (b.purchaseCount ?? 0) > 0));
});

test('activity filter "without_purchases" returns buyers with purchaseCount === 0 or missing', () => {
  const result = filterAndSortBuyers(buyers, "", "name_asc", "es-CO", "all", "without_purchases");
  const names = result.map((b) => b.name);
  assert.deepEqual(names, ["Beta", "Delta"]);
  assert.ok(result.every((b) => (b.purchaseCount ?? 0) === 0));
});

test("activity filter combines correctly with search query", () => {
  // Busca "a" → coincide Alfa, Gamma (y Beta/Delta no), de esos solo "with_purchases"
  const result = filterAndSortBuyers(buyers, "a", "name_asc", "es-CO", "all", "with_purchases");
  const names = result.map((b) => b.name);
  assert.deepEqual(names, ["Alfa", "Gamma"]);
});

test('switching back to "all" restores the full unfiltered list', () => {
  const withFilter = filterAndSortBuyers(buyers, "", "name_asc", "es-CO", "all", "with_purchases");
  const restored = filterAndSortBuyers(buyers, "", "name_asc", "es-CO", "all", "all");
  assert.equal(withFilter.length, 2);
  assert.equal(restored.length, 4);
});

