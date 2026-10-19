import assert from "node:assert/strict";
import test from "node:test";
import { calculateBuyerActivitySummary } from "../src/services/buyerFilters.ts";

const baseBuyer = {
  email: null,
  phone: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("lista vacía -> 0s limpios", () => {
  const summary = calculateBuyerActivitySummary([]);
  assert.deepEqual(summary, {
    totalCount: 0,
    withPurchasesCount: 0,
    withoutPurchasesCount: 0,
    withoutPurchasesPercentage: 0,
  });
});

test("todos con compras -> 0% sin compras", () => {
  const buyers = [
    { ...baseBuyer, id: "buyer-1", name: "Alfa", purchaseCount: 1 },
    { ...baseBuyer, id: "buyer-2", name: "Beta", purchaseCount: 4 },
    { ...baseBuyer, id: "buyer-3", name: "Gamma", purchaseCount: 10 },
  ];
  const summary = calculateBuyerActivitySummary(buyers);
  assert.deepEqual(summary, {
    totalCount: 3,
    withPurchasesCount: 3,
    withoutPurchasesCount: 0,
    withoutPurchasesPercentage: 0,
  });
});

test("todos sin compras -> 100% sin compras", () => {
  const buyers = [
    { ...baseBuyer, id: "buyer-1", name: "Alfa", purchaseCount: 0 },
    { ...baseBuyer, id: "buyer-2", name: "Beta" }, // purchaseCount missing/undefined
    { ...baseBuyer, id: "buyer-3", name: "Gamma", purchaseCount: 0 },
  ];
  const summary = calculateBuyerActivitySummary(buyers);
  assert.deepEqual(summary, {
    totalCount: 3,
    withPurchasesCount: 0,
    withoutPurchasesCount: 3,
    withoutPurchasesPercentage: 100,
  });
});

test("caso mixto -> cálculo exacto de conteos y porcentaje", () => {
  // 4 compradores: 2 con compras, 2 sin compras (1 con 0, 1 sin purchaseCount) -> 50%
  const buyersA = [
    { ...baseBuyer, id: "buyer-1", name: "Alfa", purchaseCount: 5 },
    { ...baseBuyer, id: "buyer-2", name: "Beta", purchaseCount: 0 },
    { ...baseBuyer, id: "buyer-3", name: "Gamma", purchaseCount: 2 },
    { ...baseBuyer, id: "buyer-4", name: "Delta" },
  ];
  const summaryA = calculateBuyerActivitySummary(buyersA);
  assert.deepEqual(summaryA, {
    totalCount: 4,
    withPurchasesCount: 2,
    withoutPurchasesCount: 2,
    withoutPurchasesPercentage: 50,
  });

  // 3 compradores: 1 con compras, 2 sin compras -> 2/3 = 66.666...% -> redondeo a 1 decimal = 66.7
  const buyersB = [
    { ...baseBuyer, id: "buyer-1", name: "Alfa", purchaseCount: 1 },
    { ...baseBuyer, id: "buyer-2", name: "Beta", purchaseCount: 0 },
    { ...baseBuyer, id: "buyer-3", name: "Gamma" },
  ];
  const summaryB = calculateBuyerActivitySummary(buyersB);
  assert.deepEqual(summaryB, {
    totalCount: 3,
    withPurchasesCount: 1,
    withoutPurchasesCount: 2,
    withoutPurchasesPercentage: 66.7,
  });

  // 3 compradores: 2 con compras, 1 sin compras -> 1/3 = 33.333...% -> redondeo a 1 decimal = 33.3
  const buyersC = [
    { ...baseBuyer, id: "buyer-1", name: "Alfa", purchaseCount: 3 },
    { ...baseBuyer, id: "buyer-2", name: "Beta", purchaseCount: 1 },
    { ...baseBuyer, id: "buyer-3", name: "Gamma", purchaseCount: 0 },
  ];
  const summaryC = calculateBuyerActivitySummary(buyersC);
  assert.deepEqual(summaryC, {
    totalCount: 3,
    withPurchasesCount: 2,
    withoutPurchasesCount: 1,
    withoutPurchasesPercentage: 33.3,
  });
});

