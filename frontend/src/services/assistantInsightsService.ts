import type { RemoteWasteRecord, WasteCategory } from "./wasteService.ts";
import type { SaleHistoryItem } from "./salesService.ts";
import type { Buyer } from "./buyerService.ts";
import { calculateStorageAgeDays } from "./inventoryAge.ts";

export interface CategoryValuation {
  category: WasteCategory;
  categoryLabelKey: string;
  weightKg: number;
  averagePricePerKgCop: number;
  subtotalCop: number;
  percentageOfTotalValue: number;
  hasHistoricalPrice: boolean;
}

export interface StockValuationResult {
  totalEstimatedValueCop: number;
  totalWeightKg: number;
  breakdown: CategoryValuation[];
}

export interface CompromisedCategory {
  category: WasteCategory;
  categoryLabelKey: string;
  atRiskLots: number;
  atRiskWeightKg: number;
}

export interface StorageRisksResult {
  totalLots: number;
  totalAvailableWeightKg: number;
  totalAtRiskLots: number;
  moderateRiskLots: number;
  criticalRiskLots: number;
  totalAtRiskWeightKg: number;
  moderateRiskWeightKg: number;
  criticalRiskWeightKg: number;
  compromisedCategories: CompromisedCategory[];
  severity: "optimal" | "warning" | "critical";
  oldestLotDays: number;
}

export interface RecommendedBuyer {
  buyerId: string;
  buyerName: string;
  phone: string | null;
  email: string | null;
  matchedCategories: WasteCategory[];
  totalHistoricalWeightKg: number;
  lastPurchaseDate: string | null;
}

export interface BuyerMatchResult {
  availableCategoriesWithStock: WasteCategory[];
  totalAvailableStockKg: number;
  recommendedBuyers: RecommendedBuyer[];
}

// Precios base referenciales seguros en COP/kg cuando no existen ventas previas
export const DEFAULT_BASELINE_PRICES_COP: Record<WasteCategory, number> = {
  recyclable: 1200,
  organic: 250,
  nonRecyclable: 100,
};

export const CATEGORY_LABEL_KEYS: Record<WasteCategory, string> = {
  organic: "categories.organic",
  recyclable: "categories.recyclable",
  nonRecyclable: "categories.nonRecyclable",
};

/**
 * 1. Calcula la valorización económica del stock disponible basado en precios históricos de venta.
 */
export function calculateStockValuation(
  inventory: readonly RemoteWasteRecord[],
  sales: readonly SaleHistoryItem[],
): StockValuationResult {
  const availableItems = inventory.filter(
    (item) => item.status === "available" || !("status" in item),
  );

  const categories: WasteCategory[] = ["recyclable", "organic", "nonRecyclable"];

  // 1. Agrupar peso disponible por categoría
  const weightByCategory: Record<WasteCategory, number> = {
    recyclable: 0,
    organic: 0,
    nonRecyclable: 0,
  };

  for (const item of availableItems) {
    if (item.weightKg > 0 && item.category in weightByCategory) {
      weightByCategory[item.category] += item.weightKg;
    }
  }

  // 2. Calcular precio promedio histórico ponderado por categoría
  const salesStatsByCategory: Record<
    WasteCategory,
    { totalWeight: number; totalValue: number }
  > = {
    recyclable: { totalWeight: 0, totalValue: 0 },
    organic: { totalWeight: 0, totalValue: 0 },
    nonRecyclable: { totalWeight: 0, totalValue: 0 },
  };

  for (const sale of sales) {
    if (sale.weightKg > 0 && sale.category in salesStatsByCategory) {
      salesStatsByCategory[sale.category].totalWeight += sale.weightKg;
      salesStatsByCategory[sale.category].totalValue += sale.totalValue;
    }
  }

  let totalEstimatedValueCop = 0;
  let totalWeightKg = 0;

  const rawBreakdown = categories.map((cat) => {
    const weight = Math.round(weightByCategory[cat] * 100) / 100;
    totalWeightKg += weight;

    const stats = salesStatsByCategory[cat];
    const hasHistorical = stats.totalWeight > 0;
    const avgPrice = hasHistorical
      ? Math.round(stats.totalValue / stats.totalWeight)
      : DEFAULT_BASELINE_PRICES_COP[cat];

    const subtotal = Math.round(weight * avgPrice);
    totalEstimatedValueCop += subtotal;

    return {
      category: cat,
      categoryLabelKey: CATEGORY_LABEL_KEYS[cat],
      weightKg: weight,
      averagePricePerKgCop: avgPrice,
      subtotalCop: subtotal,
      hasHistoricalPrice: hasHistorical,
      percentageOfTotalValue: 0,
    };
  });

  // Calcular porcentajes de participación económica
  const breakdown: CategoryValuation[] = rawBreakdown
    .map((item) => ({
      ...item,
      percentageOfTotalValue:
        totalEstimatedValueCop > 0
          ? Math.round((item.subtotalCop / totalEstimatedValueCop) * 100)
          : 0,
    }))
    .sort((a, b) => b.subtotalCop - a.subtotalCop);

  return {
    totalEstimatedValueCop,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    breakdown,
  };
}

/**
 * 2. Evalúa la antigüedad de los lotes y clasifica el riesgo de merma física o degradación.
 */
export function detectStorageRisks(
  inventory: readonly RemoteWasteRecord[],
  now: Date = new Date(),
): StorageRisksResult {
  const availableItems = inventory.filter(
    (item) => item.status === "available" || !("status" in item),
  );

  let moderateRiskLots = 0;
  let criticalRiskLots = 0;
  let moderateRiskWeightKg = 0;
  let criticalRiskWeightKg = 0;
  let totalAvailableWeightKg = 0;
  let oldestLotDays = 0;

  const compromisedMap: Record<
    WasteCategory,
    { atRiskLots: number; atRiskWeightKg: number }
  > = {
    recyclable: { atRiskLots: 0, atRiskWeightKg: 0 },
    organic: { atRiskLots: 0, atRiskWeightKg: 0 },
    nonRecyclable: { atRiskLots: 0, atRiskWeightKg: 0 },
  };

  for (const item of availableItems) {
    const weight = item.weightKg > 0 ? item.weightKg : 0;
    totalAvailableWeightKg += weight;

    const ageDays = calculateStorageAgeDays(item.registeredAt, now) ?? 0;
    if (ageDays > oldestLotDays) {
      oldestLotDays = ageDays;
    }

    if (ageDays > 30) {
      criticalRiskLots++;
      criticalRiskWeightKg += weight;
      if (item.category in compromisedMap) {
        compromisedMap[item.category].atRiskLots++;
        compromisedMap[item.category].atRiskWeightKg += weight;
      }
    } else if (ageDays > 15) {
      moderateRiskLots++;
      moderateRiskWeightKg += weight;
      if (item.category in compromisedMap) {
        compromisedMap[item.category].atRiskLots++;
        compromisedMap[item.category].atRiskWeightKg += weight;
      }
    }
  }

  const totalAtRiskLots = moderateRiskLots + criticalRiskLots;
  const totalAtRiskWeightKg =
    Math.round((moderateRiskWeightKg + criticalRiskWeightKg) * 100) / 100;

  const severity: "optimal" | "warning" | "critical" =
    criticalRiskLots > 0
      ? "critical"
      : moderateRiskLots > 0
        ? "warning"
        : "optimal";

  const compromisedCategories: CompromisedCategory[] = (
    Object.keys(compromisedMap) as WasteCategory[]
  )
    .filter((cat) => compromisedMap[cat].atRiskLots > 0)
    .map((cat) => ({
      category: cat,
      categoryLabelKey: CATEGORY_LABEL_KEYS[cat],
      atRiskLots: compromisedMap[cat].atRiskLots,
      atRiskWeightKg: Math.round(compromisedMap[cat].atRiskWeightKg * 100) / 100,
    }))
    .sort((a, b) => b.atRiskWeightKg - a.atRiskWeightKg);

  return {
    totalLots: availableItems.length,
    totalAvailableWeightKg: Math.round(totalAvailableWeightKg * 100) / 100,
    totalAtRiskLots,
    moderateRiskLots,
    criticalRiskLots,
    totalAtRiskWeightKg,
    moderateRiskWeightKg: Math.round(moderateRiskWeightKg * 100) / 100,
    criticalRiskWeightKg: Math.round(criticalRiskWeightKg * 100) / 100,
    compromisedCategories,
    severity,
    oldestLotDays,
  };
}

/**
 * 3. Cruza el inventario disponible con el historial de compras para recomendar clientes comerciales.
 */
export function matchBuyersForAvailableStock(
  inventory: readonly RemoteWasteRecord[],
  buyers: readonly Buyer[],
  sales: readonly SaleHistoryItem[],
): BuyerMatchResult {
  const availableItems = inventory.filter(
    (item) => item.status === "available" || !("status" in item),
  );

  // Identificar categorías con stock disponible real > 0 kg
  const stockByCat: Record<WasteCategory, number> = {
    recyclable: 0,
    organic: 0,
    nonRecyclable: 0,
  };

  let totalAvailableStockKg = 0;
  for (const item of availableItems) {
    if (item.weightKg > 0 && item.category in stockByCat) {
      stockByCat[item.category] += item.weightKg;
      totalAvailableStockKg += item.weightKg;
    }
  }

  const availableCategoriesWithStock = (
    Object.keys(stockByCat) as WasteCategory[]
  ).filter((cat) => stockByCat[cat] > 0);

  if (availableCategoriesWithStock.length === 0 || buyers.length === 0) {
    return {
      availableCategoriesWithStock,
      totalAvailableStockKg: Math.round(totalAvailableStockKg * 100) / 100,
      recommendedBuyers: [],
    };
  }

  const activeStockSet = new Set(availableCategoriesWithStock);
  const recommended: RecommendedBuyer[] = [];

  for (const buyer of buyers) {
    const buyerSales = sales.filter(
      (s) => s.buyerId === buyer.id && activeStockSet.has(s.category),
    );

    if (buyerSales.length > 0) {
      let buyerVolume = 0;
      let lastSoldAt: string | null = null;
      const matchedCats = new Set<WasteCategory>();

      for (const s of buyerSales) {
        buyerVolume += s.weightKg;
        matchedCats.add(s.category);
        if (!lastSoldAt || new Date(s.soldAt) > new Date(lastSoldAt)) {
          lastSoldAt = s.soldAt;
        }
      }

      recommended.push({
        buyerId: buyer.id,
        buyerName: buyer.name,
        phone: buyer.phone,
        email: buyer.email,
        matchedCategories: Array.from(matchedCats),
        totalHistoricalWeightKg: Math.round(buyerVolume * 100) / 100,
        lastPurchaseDate: lastSoldAt,
      });
    }
  }

  // Ordenar compradores recomendados por volumen histórico descendente
  recommended.sort(
    (a, b) => b.totalHistoricalWeightKg - a.totalHistoricalWeightKg,
  );

  return {
    availableCategoriesWithStock,
    totalAvailableStockKg: Math.round(totalAvailableStockKg * 100) / 100,
    recommendedBuyers: recommended,
  };
}

/**
 * Consulta unificada y segura de las entidades operativas de EcoPlaza.
 */
export async function fetchOperationalInsightsData(): Promise<{
  inventory: RemoteWasteRecord[];
  sales: SaleHistoryItem[];
  buyers: Buyer[];
}> {
  try {
    const [{ listAvailableWasteRecords }, { listSales }, { listBuyers }] =
      await Promise.all([
        import("./wasteService.ts"),
        import("./salesService.ts"),
        import("./buyerService.ts"),
      ]);

    const [wasteRes, salesRes, buyersRes] = await Promise.allSettled([
      listAvailableWasteRecords(),
      listSales(),
      listBuyers(),
    ]);

    const inventory =
      wasteRes.status === "fulfilled" && wasteRes.value.ok
        ? wasteRes.value.data
        : [];

    const sales =
      salesRes.status === "fulfilled" && salesRes.value.ok
        ? salesRes.value.data
        : [];

    const buyers =
      buyersRes.status === "fulfilled" && buyersRes.value.ok
        ? buyersRes.value.data
        : [];

    return { inventory, sales, buyers };
  } catch {
    return { inventory: [], sales: [], buyers: [] };
  }
}
