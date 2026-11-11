import { formatColombianDateTime } from "./colombianDate.ts";
import type { Container } from "./containerService.ts";
import {
  GeminiServiceError,
  geminiAiService,
  type GeminiErrorCode,
} from "./geminiAiService.ts";
import { getEnrichedSystemPrompt } from "./assistantContextService.ts";
import {
  calculateFleetHealth,
  generateIoTExecutiveSummary,
  type ContainerTelemetrySnapshot,
} from "./iotAnalyticsService.ts";
export type { ContainerTelemetrySnapshot };
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
import { isTelemetryFresh } from "./telemetryService.ts";

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
  void context;
  return [
    "No puedo responder con precisión a esa pregunta en modo local.",
    "",
    "Gemini no está disponible y el respaldo local solo responde consultas específicas de ventas, inventario, proyecciones o telemetría.",
    "Prueba una de esas consultas o inténtalo de nuevo cuando Gemini esté en línea.",
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

type AssistantTelemetryProvider = () => Promise<ContainerTelemetrySnapshot[]>;
let customTelemetryProvider: AssistantTelemetryProvider | null = null;

export function setAssistantTelemetryProvider(
  provider: AssistantTelemetryProvider | null,
): void {
  customTelemetryProvider = provider;
}

export function formatIoTFleetResponse(
  snapshots: ContainerTelemetrySnapshot[],
  query: string,
  lang: "es" | "en" = "es",
): string | null {
  const normalized = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const isPhysicalTarget =
    /ctr[-_]?bog[-_]?001|ctr[-_]?bog|sensor\s+(en\s+vivo|fisico|hardware)|hardware\s+(en\s+vivo|fisico)|telemetria\s+en\s+vivo|live\s+sensor|physical\s+sensor|live\s+telemetry/.test(
      normalized,
    );
  const isBattery =
    /\b(bateria|baterias|battery|batteries)\b/.test(normalized);
  const isUrgent =
    /\b(urgente|urgentes|urgencia|urgencias|critico|criticos|critica|criticas|despacho|despachos|urgent|critical|dispatch)\b/.test(
      normalized,
    );
  const isGeneralIoT =
    /\b(sensor|sensores|telemetria|telemetry|flota|fleet)\b/.test(normalized);

  if (!isPhysicalTarget && !isBattery && !isUrgent && !isGeneralIoT) {
    return null;
  }

  const isEn = lang === "en";

  if (isPhysicalTarget) {
    const physicalSnapshot = snapshots.find(
      (s) =>
        s.containerName?.toUpperCase() === "CTR-BOG-001" ||
        s.containerId?.toUpperCase().includes("CTR-BOG-001") ||
        s.isPhysicalHardware === true,
    );

    if (physicalSnapshot) {
      const statusLabel =
        physicalSnapshot.status === "critical" || physicalSnapshot.fillLevel >= 90
          ? isEn
            ? "Critical"
            : "Crítico (Critical)"
          : physicalSnapshot.status === "warning" || physicalSnapshot.fillLevel >= 70
            ? isEn
              ? "Warning"
              : "Advertencia (Warning)"
            : "Normal";

      const formattedDate = formatColombianDateTime(
        physicalSnapshot.updatedAt,
        lang,
      );
      const distanceText =
        typeof physicalSnapshot.distanceCm === "number"
          ? `${physicalSnapshot.distanceCm} cm`
          : isEn
            ? "Not available"
            : "No disponible";

      const recommendationText = isEn
        ? physicalSnapshot.fillLevel >= 90
          ? "🚨 Critical Alert: The container exceeds 90% capacity. Immediate collection dispatch is required."
          : physicalSnapshot.fillLevel >= 70
            ? "⚠️ Warning Level: Fill level is between 70% and 89%. Scheduled collection is recommended."
            : "✅ Normal Operation: Adequate capacity available."
        : physicalSnapshot.fillLevel >= 90
          ? "🚨 Alerta Crítica: El contenedor supera el 90% de capacidad. Se requiere despacho urgente de recolección."
          : physicalSnapshot.fillLevel >= 70
            ? "⚠️ Nivel de Advertencia: Nivel de llenado entre 70% y 89%. Se recomienda programar ruta de recolección próxima."
            : "✅ Operación Normal: Capacidad disponible adecuada.";

      return isEn
        ? [
            "📡 Live IoT Telemetry Sensor Status (CTR-BOG-001):",
            "",
            "• Device: CTR-BOG-001 (ESP32 Microcontroller + HC-SR04 Ultrasonic Sensor).",
            `• Fill level: ${physicalSnapshot.fillLevel}% [Status: ${statusLabel}].`,
            `• Ultrasonic distance detected: ${distanceText}.`,
            `• Operational status: ${physicalSnapshot.status ? physicalSnapshot.status.toUpperCase() : "NORMAL"}.`,
            `• Last synchronization: ${formattedDate} (Colombian Time).`,
            "",
            recommendationText,
          ].join("\n")
        : [
            "📡 Estado del Sensor de Telemetría IoT en Vivo (CTR-BOG-001):",
            "",
            "• Dispositivo: CTR-BOG-001 (Microcontrolador ESP32 + Sensor ultrasónico HC-SR04).",
            `• Nivel de llenado: ${physicalSnapshot.fillLevel}% [Estado: ${statusLabel}].`,
            `• Distancia ultrasónica detectada: ${distanceText}.`,
            `• Estado operacional: ${physicalSnapshot.status ? physicalSnapshot.status.toUpperCase() : "NORMAL"}.`,
            `• Última sincronización: ${formattedDate} (Hora de Colombia).`,
            "",
            recommendationText,
          ].join("\n");
    }

    return isEn
      ? [
          "📡 Physical Sensor Status (CTR-BOG-001):",
          "",
          "• Device: CTR-BOG-001 (ESP32 Node + HC-SR04 Ultrasonic Sensor).",
          "• Current status: Waiting for signal.",
          "",
          "The physical hardware is currently waiting for signal and has not recorded active readings in Supabase. Once the microcontroller transmits via Wi-Fi, real-time telemetry will be available.",
        ].join("\n")
      : [
          "📡 Estado del Sensor Físico (CTR-BOG-001):",
          "",
          "• Dispositivo: CTR-BOG-001 (Nodo ESP32 + Sensor ultrasónico HC-SR04).",
          "• Estado actual: En espera de señal.",
          "",
          "Actualmente el hardware físico está en espera de señal y no registra lecturas activas en la base de datos de Supabase. Una vez el microcontrolador transmita por Wi-Fi, la telemetría en tiempo real estará disponible.",
        ].join("\n");
  }

  const health = calculateFleetHealth(snapshots);

  if (isBattery) {
    if (snapshots.length === 0) {
      return isEn
        ? "🔋 IoT Battery Status:\n\nNo active sensors with telemetry in the fleet to evaluate batteries."
        : "🔋 Estado de Baterías IoT:\n\nNo hay sensores con telemetría activa en la flota para evaluar sus baterías.";
    }

    const lowBatterySensors = snapshots.filter(
      (s) => typeof s.batteryLevel === "number" && s.batteryLevel < 20,
    );

    if (lowBatterySensors.length > 0) {
      if (isEn) {
        return [
          "🔋 IoT Sensor Battery Status:",
          "",
          `• Sensors with low battery (< 20%): ${lowBatterySensors.length} device(s) require recharge or replacement:`,
          ...lowBatterySensors.map(
            (s) => `  - ${s.containerName}: ${s.batteryLevel}% battery`,
          ),
          "",
          "Recommendation: Prioritize sensors with critical battery levels to ensure telemetry continuity.",
        ].join("\n");
      }

      return [
        "🔋 Estado de Baterías de Sensores IoT:",
        "",
        `• Sensores con batería baja (< 20%): ${lowBatterySensors.length} dispositivo(s) requieren recarga o reemplazo:`,
        ...lowBatterySensors.map(
          (s) => `  - ${s.containerName}: ${s.batteryLevel}% de batería`,
        ),
        "",
        "Recomendación: Atender prioritariamente los sensores con batería crítica para asegurar la continuidad de la telemetría.",
      ].join("\n");
    }

    return isEn
      ? `🔋 IoT Sensor Battery Status:\n\n• All devices (${health.totalMonitored} monitored sensors) are operating with optimal battery levels (≥ 20%). No battery warnings reported.`
      : `🔋 Estado de Baterías de Sensores IoT:\n\n• Todos los dispositivos (${health.totalMonitored} sensores monitoreados) operan con niveles de batería óptimos (≥ 20%). No hay alertas de batería en la red.`;
  }

  if (isUrgent) {
    if (snapshots.length === 0) {
      return isEn
        ? "🚨 IoT Urgent Dispatch and Collection:\n\nNo containers with active telemetry in the fleet."
        : "🚨 Despacho y Recolección Urgente IoT:\n\nNo hay contenedores con telemetría activa en la flota.";
    }

    if (health.urgentDispatchList.length > 0) {
      if (isEn) {
        return [
          "🚨 IoT Urgent Dispatch and Collection:",
          "",
          `• Containers requiring attention (${health.urgentDispatchList.length}):`,
          ...health.urgentDispatchList.map(
            (item) =>
              `  - ${item.containerName}: ${item.fillLevel}% fill level [${
                item.priority === "CRITICAL"
                  ? "Immediate (≥ 90%)"
                  : "Scheduled (≥ 75%)"
              }]`,
          ),
          "",
          "Recommendation: Dispatch priority collection routes to prevent container overflows.",
        ].join("\n");
      }

      return [
        "🚨 Despacho y Recolección Urgente IoT:",
        "",
        `• Contenedores que requieren atención (${health.urgentDispatchList.length}):`,
        ...health.urgentDispatchList.map(
          (item) =>
            `  - ${item.containerName}: ${item.fillLevel}% de llenado [${
              item.priority === "CRITICAL"
                ? "Inmediata (≥ 90%)"
                : "Programada (≥ 75%)"
            }]`,
        ),
        "",
        "Recomendación: Enviar rutas de recolección prioritaria para prevenir desbordamientos.",
      ].join("\n");
    }

    return isEn
      ? "🚨 IoT Urgent Dispatch and Collection:\n\n• Great news: No containers exceed the warning threshold (75%). The entire fleet is operating within normal capacity."
      : "🚨 Despacho y Recolección Urgente IoT:\n\n• Excelente noticia: Ningún contenedor supera el umbral de advertencia (75%). La flota completa opera con capacidad normal.";
  }

  const executiveSummary = generateIoTExecutiveSummary(health, lang);
  return isEn
    ? `📡 General IoT Fleet and Sensors Diagnostic:\n\n${executiveSummary}`
    : `📡 Diagnóstico General de Flota y Sensores IoT:\n\n${executiveSummary}`;
}

export async function fetchIoTTelemetrySnapshots(): Promise<ContainerTelemetrySnapshot[]> {
  try {
    const { listContainers } = await import("./containerService.ts");
    const { getLatestTelemetry } = await import("./sensorService.ts");
    const { fetchLatestTelemetryByContainer } = await import(
      "./telemetryService.ts"
    );

    const [containersResult, physicalTelemetry] = await Promise.all([
      listContainers(),
      fetchLatestTelemetryByContainer("CTR-BOG-001").catch(() => null),
    ]);

    const snapshots: ContainerTelemetrySnapshot[] = [];

    if (containersResult.ok && Array.isArray(containersResult.data)) {
      const telemetryPromises: Promise<ContainerTelemetrySnapshot | null>[] =
        containersResult.data.map(async (c) => {
          try {
          const tel = await getLatestTelemetry(c.code);
            if (!tel || !isTelemetryFresh(tel.recordedAt)) return null;
            const snapshot: ContainerTelemetrySnapshot = {
              containerId: c.id,
              containerName: c.code,
              fillLevel: tel.fillLevelPercent,
              updatedAt: tel.recordedAt,
              distanceCm: tel.distanceCm,
            };
            return snapshot;
          } catch {
            return null;
          }
        });

      const resolved = await Promise.all(telemetryPromises);
      for (const item of resolved) {
        if (item) snapshots.push(item);
      }
    }

    if (physicalTelemetry) {
      const existingIdx = snapshots.findIndex(
        (s) =>
          s.containerName?.toUpperCase() === "CTR-BOG-001" ||
          s.containerId?.toUpperCase() === "CTR-BOG-001",
      );
      const physicalSnapshot: ContainerTelemetrySnapshot = {
        containerId:
          existingIdx >= 0
            ? snapshots[existingIdx].containerId
            : "iot-ctr-bog-001",
        containerName: "CTR-BOG-001",
        fillLevel: physicalTelemetry.fillPercentage,
        updatedAt: physicalTelemetry.recordedAt,
        distanceCm: physicalTelemetry.distanceCm,
        status: physicalTelemetry.status,
        isPhysicalHardware: true,
      };

      if (existingIdx >= 0) {
        snapshots[existingIdx] = {
          ...snapshots[existingIdx],
          ...physicalSnapshot,
        };
      } else {
        snapshots.unshift(physicalSnapshot);
      }
    }

    return snapshots;
  } catch {
    return [];
  }
}

export function isIoTFleetResponse(response: string): boolean {
  return (
    response.startsWith("🔋") ||
    response.startsWith("🚨") ||
    response.startsWith("📡") ||
    response.includes("IoT") ||
    response.includes("CTR-BOG-001") ||
    response.includes("telemetría") ||
    response.includes("telemetry") ||
    response.includes("HC-SR04")
  );
}

export type AssistantProvider = "gemini" | "local_fallback";

export interface AssistantResponseResult {
  content: string;
  provider: AssistantProvider;
  engine: AssistantProvider;
  model?: string;
  latencyMs?: number;
  fallbackReason?: {
    code: GeminiErrorCode;
    message: string;
    providerStatus?: number;
    model?: string;
  };
}

let lastAssistantProvider: AssistantProvider = "local_fallback";

export function getLastAssistantProvider(): AssistantProvider {
  return lastAssistantProvider;
}

export function setLastAssistantProvider(provider: AssistantProvider): void {
  lastAssistantProvider = provider;
}

const FALLBACK_MESSAGES: Record<GeminiErrorCode, string> = {
  not_configured: "Gemini aún no está configurado en el servidor.",
  auth_required: "La sesión no pudo autenticarse con el servicio de IA.",
  invalid_credentials: "La credencial del proveedor requiere revisión.",
  model_unavailable: "El modelo en línea no está disponible.",
  quota_exceeded: "La cuota de Gemini está agotada temporalmente.",
  provider_unavailable: "Gemini no está disponible temporalmente; la respuesta local no sustituye al proveedor.",
  timeout: "Gemini tardó demasiado en responder.",
  network_error: "No fue posible conectar con Gemini.",
  cancelled: "La consulta en línea fue cancelada.",
  rate_limited: "Se alcanzó el límite temporal de consultas.",
  invalid_request: "La consulta no pudo enviarse al proveedor.",
  malformed_response: "Gemini devolvió una respuesta incompleta.",
  unknown: "Gemini no pudo responder en este intento.",
};

const MINIMAL_GEMINI_SYSTEM_INSTRUCTION = [
  "Eres el asistente de EcoPlaza Smart Waste Platform en Colombia.",
  "Responde de forma clara y profesional en el idioma de la pregunta.",
  "No afirmes tener acceso a datos actuales de inventario, sensores o ventas cuando no se hayan incluido en esta solicitud.",
  "Si el usuario pregunta por esos datos y no están disponibles, explica que no se pudo cargar el contexto operativo para esta respuesta.",
].join("\n");

function classifyGeminiFailure(error: unknown): GeminiErrorCode {
  if (error instanceof GeminiServiceError) return error.code;
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|exhausted/i.test(message)) return "quota_exceeded";
  if (/404|not found|modelo.*disponible/i.test(message)) return "model_unavailable";
  if (/401|403|auth|credencial|API_KEY_INVALID/i.test(message)) {
    return "invalid_credentials";
  }
  if (/503|high demand|saturado|unavailable/i.test(message)) {
    return "provider_unavailable";
  }
  if (/timeout|tiempo de espera/i.test(message)) return "timeout";
  if (/network|fetch|conexi[oó]n/i.test(message)) return "network_error";
  return "unknown";
}

export async function generateLocalAssistantResponse(
  prompt: string,
  effectiveContext?: AssistantAnalyticsContext,
  telemetryOverride?: ContainerTelemetrySnapshot[],
  effectiveLang: "es" | "en" = "es",
): Promise<string> {
  let snapshots: ContainerTelemetrySnapshot[] | null = null;
  if (telemetryOverride !== undefined) {
    snapshots = telemetryOverride;
  } else if (customTelemetryProvider) {
    snapshots = await customTelemetryProvider();
  }

  const normalized = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const isCandidateIoT =
    /\b(sensor|sensores|telemetria|telemetry|flota|fleet|bateria|baterias|battery|batteries|urgente|urgentes|urgencia|urgencias|critico|criticos|critica|criticas|despacho|despachos|urgent|critical|dispatch)\b/.test(
      normalized,
    ) ||
    /ctr[-_]?bog[-_]?001|ctr[-_]?bog|hardware|en vivo|\blive\b/.test(normalized);

  if (isCandidateIoT) {
    if (snapshots === null) {
      snapshots = await fetchIoTTelemetrySnapshots();
    }
    const iotResponse = formatIoTFleetResponse(snapshots, prompt, effectiveLang);
    if (iotResponse !== null) {
      return iotResponse;
    }
  }

  const context = await getAssistantContext(effectiveContext);
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

export async function generateAssistantResponseWithProvider(
  prompt: string,
  lang: "es" | "en",
  telemetryOverride?: ContainerTelemetrySnapshot[],
): Promise<AssistantResponseResult>;
export async function generateAssistantResponseWithProvider(
  prompt: string,
  contextOverride?: AssistantAnalyticsContext,
  telemetryOverride?: ContainerTelemetrySnapshot[],
  lang?: "es" | "en",
): Promise<AssistantResponseResult>;
export async function generateAssistantResponseWithProvider(
  prompt: string,
  contextOrLang?: AssistantAnalyticsContext | "es" | "en",
  telemetryOverride?: ContainerTelemetrySnapshot[],
  lang: "es" | "en" = "es",
): Promise<AssistantResponseResult> {
  const effectiveLang: "es" | "en" =
    typeof contextOrLang === "string" ? contextOrLang : lang;
  const effectiveContext =
    typeof contextOrLang === "string" ? undefined : contextOrLang;
  const effectiveTelemetry =
    typeof contextOrLang === "string" ? telemetryOverride : telemetryOverride;
  let fallbackCode: GeminiErrorCode;
  let fallbackDiagnostics: {
    providerStatus?: number;
    model?: string;
  } = {};

  // 1. Consultar prioritariamente el proxy autenticado de Gemini.
  if (geminiAiService.isConfigured()) {
    let systemInstruction = MINIMAL_GEMINI_SYSTEM_INSTRUCTION;
    try {
      systemInstruction = await getEnrichedSystemPrompt(effectiveTelemetry);
    } catch (error: unknown) {
      if (import.meta.env?.DEV) {
        const errorName = error instanceof Error ? error.name : "UnknownError";
        console.warn(
          `[Assistant context] No se pudo preparar el contexto enriquecido (${errorName}); se enviará contexto mínimo.`,
        );
      }
    }

    try {
      const generatedText = await geminiAiService.generateText(prompt, {
        systemInstruction,
      });

      if (typeof generatedText === "string" && generatedText.trim().length > 0) {
        const metadata = geminiAiService.getLastMetadata();
        lastAssistantProvider = "gemini";
        return {
          content: generatedText.trim(),
          provider: "gemini",
          engine: "gemini",
          model: metadata?.model,
          latencyMs: metadata?.latencyMs,
        };
      }
      fallbackCode = "malformed_response";
    } catch (error: unknown) {
      fallbackCode = classifyGeminiFailure(error);
      if (error instanceof GeminiServiceError) {
        fallbackDiagnostics = {
          providerStatus: error.providerStatus,
          model: error.model,
        };
      }
      if (import.meta.env?.DEV) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Assistant AI Fallback]: Error al consultar Gemini: ${errorMsg}`,
        );
      }
    }
  } else {
    fallbackCode = "not_configured";
    if (import.meta.env?.DEV) {
      console.warn("[Assistant AI Fallback]: Servicio de Gemini no configurado");
    }
  }

  // 2. Fallback determinista automático a heurísticas locales
  const fallbackText = await generateLocalAssistantResponse(
    prompt,
    effectiveContext,
    effectiveTelemetry,
    effectiveLang,
  );

  lastAssistantProvider = "local_fallback";
  return {
    content: fallbackText,
    provider: "local_fallback",
    engine: "local_fallback",
    fallbackReason: fallbackCode
      ? {
          code: fallbackCode,
          message: FALLBACK_MESSAGES[fallbackCode],
          ...fallbackDiagnostics,
        }
      : undefined,
  };
}

export async function generateAssistantResponse(
  prompt: string,
  lang: "es" | "en",
  telemetryOverride?: ContainerTelemetrySnapshot[],
): Promise<string>;
export async function generateAssistantResponse(
  prompt: string,
  contextOverride?: AssistantAnalyticsContext,
  telemetryOverride?: ContainerTelemetrySnapshot[],
  lang?: "es" | "en",
): Promise<string>;
export async function generateAssistantResponse(
  prompt: string,
  contextOrLang?: AssistantAnalyticsContext | "es" | "en",
  telemetryOverride?: ContainerTelemetrySnapshot[],
  lang: "es" | "en" = "es",
): Promise<string> {
  const result =
    typeof contextOrLang === "string"
      ? await generateAssistantResponseWithProvider(
          prompt,
          contextOrLang,
          telemetryOverride,
        )
      : await generateAssistantResponseWithProvider(
          prompt,
          contextOrLang,
          telemetryOverride,
          lang,
        );
  return result.content;
}
