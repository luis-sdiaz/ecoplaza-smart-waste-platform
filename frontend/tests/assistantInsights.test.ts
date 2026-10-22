import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStockValuation,
  detectStorageRisks,
  matchBuyersForAvailableStock,
  DEFAULT_BASELINE_PRICES_COP,
} from "../src/services/assistantInsightsService.ts";
import type { RemoteWasteRecord } from "../src/services/wasteService.ts";
import type { SaleHistoryItem } from "../src/services/salesService.ts";
import type { Buyer } from "../src/services/buyerService.ts";

// Datos de prueba controlados
const mockInventory: RemoteWasteRecord[] = [
  {
    id: "w-1",
    recordNumber: "REC-001",
    containerId: "c-1",
    category: "recyclable",
    weightKg: 100,
    registeredAt: "2026-10-01T10:00:00.000Z", // Antiguo (~21 días respecto a 2026-10-22)
    status: "available",
  },
  {
    id: "w-2",
    recordNumber: "REC-002",
    containerId: "c-1",
    category: "recyclable",
    weightKg: 50,
    registeredAt: "2026-09-10T10:00:00.000Z", // Crítico (~42 días)
    status: "available",
  },
  {
    id: "w-3",
    recordNumber: "REC-003",
    containerId: "c-2",
    category: "organic",
    weightKg: 200,
    registeredAt: "2026-10-18T10:00:00.000Z", // Reciente (~4 días)
    status: "available",
  },
  {
    id: "w-4",
    recordNumber: "REC-004",
    containerId: "c-3",
    category: "nonRecyclable",
    weightKg: 30,
    registeredAt: "2026-10-20T10:00:00.000Z",
    status: "available",
  },
  {
    id: "w-sold",
    recordNumber: "REC-005",
    containerId: "c-1",
    category: "recyclable",
    weightKg: 80,
    registeredAt: "2026-09-01T10:00:00.000Z",
    status: "sold", // Debe ser ignorado por no estar disponible
  },
];

const mockSales: SaleHistoryItem[] = [
  {
    id: "s-1",
    buyerId: "buyer-alpha",
    buyerName: "Reciclajes Alpha SAS",
    wasteRecordId: "w-sold",
    wasteRecordNumber: "REC-005",
    category: "recyclable",
    weightKg: 50,
    unitPrice: 1500,
    totalValue: 75000,
    soldAt: "2026-10-10T12:00:00.000Z",
  },
  {
    id: "s-2",
    buyerId: "buyer-beta",
    buyerName: "Compost del Valle",
    wasteRecordId: "w-sold-2",
    wasteRecordNumber: "REC-006",
    category: "recyclable",
    weightKg: 50,
    unitPrice: 1300,
    totalValue: 65000,
    soldAt: "2026-10-15T12:00:00.000Z",
  },
  // No hay ventas de 'organic' ni 'nonRecyclable' en el mock de ventas
];

const mockBuyers: Buyer[] = [
  {
    id: "buyer-alpha",
    name: "Reciclajes Alpha SAS",
    phone: "3001234567",
    email: "alpha@reciclajes.co",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "buyer-beta",
    name: "Compost del Valle",
    phone: "3109876543",
    email: "valle@compost.co",
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
  },
  {
    id: "buyer-gamma",
    name: "BioEnergía Sin Compras",
    phone: null,
    email: "info@bioenergia.co",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
];

const mockReferenceDate = new Date("2026-10-22T12:00:00.000Z");

test("a) calculateStockValuation calcula valorización económica y precio histórico con fallback", () => {
  const result = calculateStockValuation(mockInventory, mockSales);

  // Peso total disponible: 100 + 50 (recyclable) + 200 (organic) + 30 (nonRecyclable) = 380 kg
  assert.equal(result.totalWeightKg, 380);

  // Recyclable tiene 100 kg ventas (50 + 50) por 140,000 COP => avgPrice = 1400 COP/kg
  // Stock disponible recyclable = 150 kg => 150 * 1400 = 210,000 COP
  const recyclableVal = result.breakdown.find(
    (b) => b.category === "recyclable",
  );
  assert.ok(recyclableVal);
  assert.equal(recyclableVal.weightKg, 150);
  assert.equal(recyclableVal.hasHistoricalPrice, true);
  assert.equal(recyclableVal.averagePricePerKgCop, 1400);
  assert.equal(recyclableVal.subtotalCop, 210000);

  // Organic no tiene ventas => usa precio base referencial (250 COP/kg)
  // 200 kg * 250 COP/kg = 50,000 COP
  const organicVal = result.breakdown.find((b) => b.category === "organic");
  assert.ok(organicVal);
  assert.equal(organicVal.weightKg, 200);
  assert.equal(organicVal.hasHistoricalPrice, false);
  assert.equal(
    organicVal.averagePricePerKgCop,
    DEFAULT_BASELINE_PRICES_COP.organic,
  );
  assert.equal(organicVal.subtotalCop, 50000);

  // NonRecyclable no tiene ventas => usa precio base (100 COP/kg)
  // 30 kg * 100 COP/kg = 3,000 COP
  const nonRecyclableVal = result.breakdown.find(
    (b) => b.category === "nonRecyclable",
  );
  assert.ok(nonRecyclableVal);
  assert.equal(nonRecyclableVal.weightKg, 30);
  assert.equal(nonRecyclableVal.hasHistoricalPrice, false);
  assert.equal(nonRecyclableVal.subtotalCop, 3000);

  // Total estimado = 210,000 + 50,000 + 3,000 = 263,000 COP
  assert.equal(result.totalEstimatedValueCop, 263000);

  // Participación porcentual de recyclable: 210,000 / 263,000 ~= 80%
  assert.ok(recyclableVal.percentageOfTotalValue >= 75);
});

test("b) detectStorageRisks clasifica antigüedad y detecta lotes en riesgo moderado y crítico", () => {
  const result = detectStorageRisks(mockInventory, mockReferenceDate);

  // Lotes disponibles: 4
  assert.equal(result.totalLots, 4);

  // w-1 (~21 días): moderado (> 15 y <= 30)
  // w-2 (~42 días): crítico (> 30)
  assert.equal(result.criticalRiskLots, 1);
  assert.equal(result.criticalRiskWeightKg, 50);

  assert.equal(result.moderateRiskLots, 1);
  assert.equal(result.moderateRiskWeightKg, 100);

  assert.equal(result.totalAtRiskLots, 2);
  assert.equal(result.totalAtRiskWeightKg, 150);

  // Como hay al menos 1 lote crítico, la severidad general es "critical"
  assert.equal(result.severity, "critical");

  // La categoría comprometida es 'recyclable'
  assert.equal(result.compromisedCategories.length, 1);
  assert.equal(result.compromisedCategories[0].category, "recyclable");
  assert.equal(result.compromisedCategories[0].atRiskLots, 2);
  assert.equal(result.compromisedCategories[0].atRiskWeightKg, 150);

  // Inventario sin riesgo devuelve estado óptimo
  const freshInventory: RemoteWasteRecord[] = [
    {
      id: "fresh-1",
      recordNumber: "F-1",
      containerId: "c-1",
      category: "recyclable",
      weightKg: 40,
      registeredAt: "2026-10-21T00:00:00.000Z", // 1 día
      status: "available",
    },
  ];
  const freshResult = detectStorageRisks(freshInventory, mockReferenceDate);
  assert.equal(freshResult.totalAtRiskLots, 0);
  assert.equal(freshResult.severity, "optimal");
});

test("c) matchBuyersForAvailableStock recomienda compradores afines ordenados por volumen histórico", () => {
  const result = matchBuyersForAvailableStock(
    mockInventory,
    mockBuyers,
    mockSales,
  );

  // Categorías disponibles con stock: recyclable, organic, nonRecyclable
  assert.equal(result.availableCategoriesWithStock.length, 3);
  assert.equal(result.totalAvailableStockKg, 380);

  // Compradores recomendados: buyer-alpha (50 kg) y buyer-beta (50 kg)
  // buyer-gamma nunca ha comprado nada disponible => no debe estar en la recomendación
  assert.equal(result.recommendedBuyers.length, 2);

  const buyerAlpha = result.recommendedBuyers.find(
    (b) => b.buyerId === "buyer-alpha",
  );
  assert.ok(buyerAlpha);
  assert.equal(buyerAlpha.buyerName, "Reciclajes Alpha SAS");
  assert.equal(buyerAlpha.phone, "3001234567");
  assert.equal(buyerAlpha.email, "alpha@reciclajes.co");
  assert.deepEqual(buyerAlpha.matchedCategories, ["recyclable"]);
  assert.equal(buyerAlpha.totalHistoricalWeightKg, 50);

  // Caso borde: inventario sin stock disponible retorna arreglo vacío sin errores
  const emptyStockResult = matchBuyersForAvailableStock(
    [],
    mockBuyers,
    mockSales,
  );
  assert.equal(emptyStockResult.recommendedBuyers.length, 0);
  assert.equal(emptyStockResult.totalAvailableStockKg, 0);
});

