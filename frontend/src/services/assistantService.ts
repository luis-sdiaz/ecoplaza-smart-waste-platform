import type { Container } from "./containerService.ts";
import {
  selectOldestAvailableInventory,
  type AgingInventoryItem,
} from "./dashboardAgingInventory.ts";
import {
  findTopRevenueCategory,
  type TopRevenueCategory,
} from "./dashboardRevenueCategory.ts";
import { sumSafeMonetaryValues } from "./monetarySafety.ts";
import {
  calculateAverageSellingPricePerKg,
  summarizeSalesByCategory,
} from "./salesMetrics.ts";
import type { SaleHistoryItem } from "./salesService.ts";
import type { RemoteWasteRecord, WasteCategory } from "./wasteService.ts";

export interface AssistantAnalyticsContext {
  totalWasteRecords: number;
  totalRegisteredWeightKg: number;
  availableWeightKg: number;
  availableWeightByCategory: {
    organic: number;
    recyclable: number;
    nonRecyclable: number;
  };
  totalSalesCount: number;
  grossRevenueCop: number;
  averagePricePerKgCop: number | null;
  topPerformingCategory: TopRevenueCategory | null;
  oldestAvailableInventory: AgingInventoryItem[];
  totalContainersCount: number;
}

export type AssistantPromptCategory =
  | "sales"
  | "inventory"
  | "projection"
  | "general";

type AssistantContextProvider = () => Promise<AssistantAnalyticsContext>;

let customContextProvider: AssistantContextProvider | null = null;

export function setAssistantDataProvider(
  provider: AssistantContextProvider | null,
): void {
  customContextProvider = provider;
}

export function formatCurrencyCop(amount: number): string {
  const hasDecimals = amount % 1 !== 0;
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted.replace(/\u00a0/g, " ");
}

export function formatWeightKg(weightKg: number): string {
  const formatted = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(weightKg);
  return `${formatted.replace(/\u00a0/g, " ")} kg`;
}

export function getCategoryLabelEs(category: string): string {
  switch (category) {
    case "organic":
      return "Orgánicos";
    case "recyclable":
      return "Reciclables";
    case "nonRecyclable":
      return "No aprovechables";
    default:
      return category;
  }
}

export function classifyAssistantPrompt(prompt: string): AssistantPromptCategory {
  const normalized = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    /\b(proyeccion|proyecciones|proyectar|estimacion|estimar|estimado|estimados|pronostico|valor\s+potencial)\b/.test(
      normalized,
    )
  ) {
    return "projection";
  }

  if (
    /\b(inventario|inventarios|estancado|estancados|estancada|estancadas|stock|almacenamiento|almacen|disponible|disponibles)\b/.test(
      normalized,
    )
  ) {
    return "inventory";
  }

  if (
    /\b(venta|ventas|vendido|vendidos|vendida|vendidas|vender|facturacion|factura|facturas|ingreso|ingresos|comercial)\b/.test(
      normalized,
    )
  ) {
    return "sales";
  }

  return "general";
}

export function buildAssistantAnalyticsContext(
  wasteRecords: readonly RemoteWasteRecord[],
  sales: readonly SaleHistoryItem[],
  containers: readonly Container[],
  now: Date = new Date(),
): AssistantAnalyticsContext {
  const totalWasteRecords = wasteRecords.length;
  let totalRegisteredGrams = 0;

  for (const record of wasteRecords) {
    if (Number.isFinite(record.weightKg) && record.weightKg > 0) {
      totalRegisteredGrams += Math.round(record.weightKg * 1000);
    }
  }
  const totalRegisteredWeightKg = totalRegisteredGrams / 1000;

  const availableRecords = wasteRecords.filter(
    (record) => record.status === "available",
  );
  let availableTotalGrams = 0;
  const availableWeightByCategory: Record<WasteCategory, number> = {
    organic: 0,
    recyclable: 0,
    nonRecyclable: 0,
  };

  for (const record of availableRecords) {
    if (Number.isFinite(record.weightKg) && record.weightKg > 0) {
      const grams = Math.round(record.weightKg * 1000);
      availableTotalGrams += grams;
      if (record.category in availableWeightByCategory) {
        availableWeightByCategory[record.category] =
          (Math.round(availableWeightByCategory[record.category] * 1000) +
            grams) /
          1000;
      }
    }
  }
  const availableWeightKg = availableTotalGrams / 1000;

  const totalSalesCount = sales.length;
  const grossRevenueCop =
    sumSafeMonetaryValues(sales.map((s) => s.totalValue)) ?? 0;
  const averagePricePerKgCop = calculateAverageSellingPricePerKg(sales);

  const categorySummaries = summarizeSalesByCategory(sales);
  let topPerformingCategory: TopRevenueCategory | null = null;
  if (categorySummaries) {
    const reportCategoryItems = categorySummaries.map((s) => ({
      category: s.category,
      salesCount: s.saleCount,
      soldWeightKg: s.totalWeightKg,
      grossSalesValue: s.grossRevenue,
      averagePricePerKg:
        s.totalWeightKg > 0 ? s.grossRevenue / s.totalWeightKg : 0,
    }));
    topPerformingCategory = findTopRevenueCategory(
      reportCategoryItems,
      grossRevenueCop,
    );
  }

  const oldestAvailableInventory = selectOldestAvailableInventory(
    availableRecords,
    containers,
    now,
    5,
  );

  return {
    totalWasteRecords,
    totalRegisteredWeightKg,
    availableWeightKg,
    availableWeightByCategory,
    totalSalesCount,
    grossRevenueCop,
    averagePricePerKgCop,
    topPerformingCategory,
    oldestAvailableInventory,
    totalContainersCount: containers.length,
  };
}

export function formatAssistantSalesResponse(
  context: AssistantAnalyticsContext,
): string {
  const { totalSalesCount, grossRevenueCop, topPerformingCategory } = context;

  if (totalSalesCount === 0) {
    return [
      "📊 Análisis de Ventas e Ingresos:",
      "",
      "• Cantidad de transacciones: 0 ventas registradas.",
      `• Ingresos brutos totales: ${formatCurrencyCop(0)} COP.`,
      "• Categoría con mayor rendimiento: No se registran ventas para determinar una categoría líder.",
      "",
      "Actualmente la plataforma no cuenta con transacciones comerciales registradas en el período. Cuando se completen ventas, aquí podrás consultar el desglose de rendimiento y volumen facturado.",
    ].join("\n");
  }

  const transactionsLabel =
    topPerformingCategory && topPerformingCategory.salesCount === 1
      ? "1 transacción"
      : `${topPerformingCategory?.salesCount ?? 0} transacciones`;

  const topCategoryText = topPerformingCategory
    ? `${getCategoryLabelEs(topPerformingCategory.category)} (${formatCurrencyCop(topPerformingCategory.grossSalesValue)} COP, ${topPerformingCategory.revenuePercentage.toFixed(1)}% de los ingresos totales, ${formatWeightKg(topPerformingCategory.soldWeightKg)} vendidos en ${transactionsLabel})`
    : "Sin datos concluyentes";

  const salesCountLabel =
    totalSalesCount === 1 ? "1 venta registrada" : `${totalSalesCount} ventas registradas`;

  return [
    "📊 Análisis de Rendimiento y Tendencias de Ventas:",
    "",
    `• Cantidad de transacciones: ${salesCountLabel}.`,
    `• Ingresos brutos totales: ${formatCurrencyCop(grossRevenueCop)} COP.`,
    `• Categoría con mayor rendimiento: ${topCategoryText}.`,
    "",
    "El flujo comercial refleja las transacciones consolidadas en la plataforma. Puedes consultar detalles por comprador o rango de fechas desde el módulo de Ventas.",
  ].join("\n");
}

export function formatAssistantInventoryResponse(
  context: AssistantAnalyticsContext,
): string {
  const {
    availableWeightKg,
    availableWeightByCategory,
    oldestAvailableInventory,
  } = context;

  if (availableWeightKg === 0 && oldestAvailableInventory.length === 0) {
    return [
      "♻️ Diagnóstico de Inventario y Stock Disponible:",
      "",
      `• Peso total disponible: ${formatWeightKg(0)}.`,
      "• Desglose por categoría: Orgánicos: 0 kg | Reciclables: 0 kg | No aprovechables: 0 kg.",
      "",
      "No hay residuos estancados ni disponibles en almacenamiento actualmente. Todo el material registrado ha sido comercializado o despachado.",
    ].join("\n");
  }

  const oldestItemsLines = oldestAvailableInventory.map((item, index) => {
    const containerStr = item.containerCode
      ? ` | Contenedor: ${item.containerCode}`
      : "";
    const daysStr = item.ageDays === 1 ? "1 día" : `${item.ageDays} días`;
    return `  ${index + 1}. ${item.reference} (${getCategoryLabelEs(item.category)}) — ${formatWeightKg(item.weightKg)}${containerStr} [${daysStr} de antigüedad]`;
  });

  return [
    "♻️ Diagnóstico de Inventario y Residuos en Almacenamiento:",
    "",
    `• Peso total disponible: ${formatWeightKg(availableWeightKg)}.`,
    "• Desglose por categoría:",
    `  - Orgánicos: ${formatWeightKg(availableWeightByCategory.organic)}`,
    `  - Reciclables: ${formatWeightKg(availableWeightByCategory.recyclable)}`,
    `  - No aprovechables: ${formatWeightKg(availableWeightByCategory.nonRecyclable)}`,
    "",
    "📦 Materiales con mayor tiempo en almacenamiento (antigüedad):",
    ...(oldestItemsLines.length > 0
      ? oldestItemsLines
      : ["  No hay registros disponibles para calcular antigüedad."]),
    "",
    "Recomendación: Monitorear aquellos residuos con mayor tiempo de estancia para priorizar su venta o tratamiento y evitar la saturación de los contenedores.",
  ].join("\n");
}

export function formatAssistantProjectionResponse(
  context: AssistantAnalyticsContext,
): string {
  const { availableWeightKg, availableWeightByCategory, averagePricePerKgCop } =
    context;

  if (averagePricePerKgCop === null || averagePricePerKgCop <= 0) {
    return [
      "📈 Proyección de Ingresos Basada en Stock Actual:",
      "",
      `• Inventario disponible en stock: ${formatWeightKg(availableWeightKg)}.`,
      "• Precio promedio histórico de venta: Sin datos suficientes en el histórico de ventas.",
      "• Valor estimado del stock: No es posible calcular la proyección sin ventas previas registradas.",
      "",
      "Para proyectar los ingresos potenciales se requiere registrar transacciones comerciales que determinen el precio promedio por kilogramo en la plataforma.",
    ].join("\n");
  }

  const estimatedRevenue =
    Math.round(availableWeightKg * averagePricePerKgCop * 100) / 100;

  return [
    "📈 Proyección de Ingresos Basada en Stock Actual:",
    "",
    `• Inventario disponible valorizable: ${formatWeightKg(availableWeightKg)}.`,
    `• Precio promedio por kilogramo (histórico de ventas): ${formatCurrencyCop(averagePricePerKgCop)} COP/kg.`,
    `• Valor estimado proyectado: ${formatCurrencyCop(estimatedRevenue)} COP.`,
    "",
    "• Composición del inventario disponible para comercialización:",
    `  - Orgánicos: ${formatWeightKg(availableWeightByCategory.organic)}`,
    `  - Reciclables: ${formatWeightKg(availableWeightByCategory.recyclable)}`,
    `  - No aprovechables: ${formatWeightKg(availableWeightByCategory.nonRecyclable)}`,
    "",
    "Nota: La proyección asume la liquidación del stock disponible al valor promedio ponderado observado en el histórico de ventas de la plataforma.",
  ].join("\n");
}

export function formatAssistantGeneralResponse(
  context: AssistantAnalyticsContext,
): string {
  const {
    totalContainersCount,
    totalWasteRecords,
    totalRegisteredWeightKg,
    availableWeightKg,
    totalSalesCount,
    grossRevenueCop,
  } = context;

  const containersLabel =
    totalContainersCount === 1
      ? "1 contenedor registrado"
      : `${totalContainersCount} contenedores registrados`;

  const recordsLabel =
    totalWasteRecords === 1 ? "1 entrada" : `${totalWasteRecords} entradas`;

  const salesLabel =
    totalSalesCount === 1 ? "1 venta" : `${totalSalesCount} ventas`;

  return [
    "🌱 Resumen Operativo General de EcoPlaza:",
    "",
    `• Infraestructura: ${containersLabel} en la cuenta activa.`,
    "• Volumen de residuos gestionados:",
    `  - Total de registros: ${recordsLabel}.`,
    `  - Peso total acumulado: ${formatWeightKg(totalRegisteredWeightKg)}.`,
    `  - Stock disponible en inventario: ${formatWeightKg(availableWeightKg)}.`,
    "• Estado comercial:",
    `  - Transacciones de venta: ${salesLabel}.`,
    `  - Ingresos brutos acumulados: ${formatCurrencyCop(grossRevenueCop)} COP.`,
    "",
    "¿En qué área específica deseas profundizar? Puedes preguntarme sobre:",
    '• "Analizar tendencias de ventas de este mes"',
    '• "Identificar residuos estancados en inventario"',
    '• "Proyectar ingresos basados en stock actual"',
  ].join("\n");
}

export async function fetchPlatformAnalyticsContext(): Promise<AssistantAnalyticsContext> {
  const [wasteModule, salesModule, containerModule] = await Promise.all([
    import("./wasteService.ts"),
    import("./salesService.ts"),
    import("./containerService.ts"),
  ]);

  const [wasteResult, salesResult, containerResult] = await Promise.all([
    wasteModule.listWasteRecords(),
    salesModule.listSales(),
    containerModule.listContainers(),
  ]);

  if (!wasteResult.ok) {
    throw new Error(`Failed to fetch waste records: ${wasteResult.error.code}`);
  }
  if (!salesResult.ok) {
    throw new Error(`Failed to fetch sales: ${salesResult.error.code}`);
  }
  if (!containerResult.ok) {
    throw new Error(`Failed to fetch containers: ${containerResult.error.code}`);
  }

  return buildAssistantAnalyticsContext(
    wasteResult.data,
    salesResult.data,
    containerResult.data,
  );
}

export async function getAssistantContext(
  contextOverride?: AssistantAnalyticsContext,
): Promise<AssistantAnalyticsContext> {
  if (contextOverride) {
    return contextOverride;
  }
  if (customContextProvider) {
    return await customContextProvider();
  }
  return await fetchPlatformAnalyticsContext();
}

export async function generateAssistantResponse(
  prompt: string,
  contextOverride?: AssistantAnalyticsContext,
): Promise<string> {
  const context = await getAssistantContext(contextOverride);
  const intent = classifyAssistantPrompt(prompt);

  switch (intent) {
    case "sales":
      return formatAssistantSalesResponse(context);
    case "inventory":
      return formatAssistantInventoryResponse(context);
    case "projection":
      return formatAssistantProjectionResponse(context);
    case "general":
      return formatAssistantGeneralResponse(context);
  }
}

