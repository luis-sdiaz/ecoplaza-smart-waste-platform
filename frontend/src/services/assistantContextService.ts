export interface EcoPlazaLiveContext {
  inventorySummary: {
    totalWeightKg: number;
    totalEstimatedValueCop: number;
    breakdownByCategory: Array<{
      category: string;
      weightKg: number;
      estimatedValueCop: number;
    }>;
  };
  containersSummary: {
    totalContainers: number;
    criticalContainers: Array<{
      containerId: string;
      location: string;
      materialType: string;
      fillPercentage: number;
      alertLevel: "normal" | "warning" | "critical";
    }>;
  };
  iotTelemetrySummary: {
    onlineSensors: number;
    totalSensors: number;
    lastUpdateIso: string | null;
  };
}

type LiveContextProvider = () => Promise<EcoPlazaLiveContext>;
let customContextProvider: LiveContextProvider | null = null;

export function setEcoPlazaLiveContextProvider(
  provider: LiveContextProvider | null,
): void {
  customContextProvider = provider;
}

export function formatCurrencyCop(amount: number): string {
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export function calculateAlertLevel(
  fillPercentage: number,
): "normal" | "warning" | "critical" {
  if (fillPercentage >= 80) return "critical";
  if (fillPercentage >= 60) return "warning";
  return "normal";
}

/**
 * Consulta y consolida en vivo el estado operativo y comercial de EcoPlaza.
 * Aplica fallbacks seguros y contingencia ante fallos de red o base de datos.
 */
export async function fetchEcoPlazaLiveContext(): Promise<EcoPlazaLiveContext> {
  if (customContextProvider) {
    return await customContextProvider();
  }

  const fallbackContext: EcoPlazaLiveContext = {
    inventorySummary: {
      totalWeightKg: 0,
      totalEstimatedValueCop: 0,
      breakdownByCategory: [
        { category: "organic", weightKg: 0, estimatedValueCop: 0 },
        { category: "recyclable", weightKg: 0, estimatedValueCop: 0 },
        { category: "nonRecyclable", weightKg: 0, estimatedValueCop: 0 },
      ],
    },
    containersSummary: {
      totalContainers: 0,
      criticalContainers: [],
    },
    iotTelemetrySummary: {
      onlineSensors: 0,
      totalSensors: 0,
      lastUpdateIso: null,
    },
  };

  try {
    const [wasteModule, salesModule, containerModule, sensorModule, insightsModule] =
      await Promise.all([
        import("./wasteService.ts"),
        import("./salesService.ts"),
        import("./containerService.ts"),
        import("./sensorService.ts"),
        import("./assistantInsightsService.ts"),
      ]);

    const [wasteRes, salesRes, containersRes] = await Promise.allSettled([
      wasteModule.listAvailableWasteRecords(),
      salesModule.listSales(),
      containerModule.listContainers(),
    ]);

    const inventory =
      wasteRes.status === "fulfilled" && wasteRes.value?.ok
        ? wasteRes.value.data
        : [];
    const sales =
      salesRes.status === "fulfilled" && salesRes.value?.ok
        ? salesRes.value.data
        : [];
    const containers =
      containersRes.status === "fulfilled" && containersRes.value?.ok
        ? containersRes.value.data
        : [];

    // 1. Resumen de inventario y valorización comercial
    const valuation = insightsModule.calculateStockValuation(inventory, sales);
    const inventorySummary = {
      totalWeightKg: valuation.totalWeightKg,
      totalEstimatedValueCop: valuation.totalEstimatedValueCop,
      breakdownByCategory: valuation.breakdown.map((b) => ({
        category: b.category,
        weightKg: b.weightKg,
        estimatedValueCop: b.subtotalCop,
      })),
    };

    // Mapeo de contenedor a categoría de material
    const containerMaterialMap = new Map<string, string>();
    for (const record of inventory) {
      if (record.containerId && !containerMaterialMap.has(record.containerId)) {
        containerMaterialMap.set(
          record.containerId,
          getCategoryLabelEs(record.category),
        );
      }
    }

    // 2. Telemetría y Contenedores Monitoreados
    let onlineSensors = 0;
    let latestTimestamp: string | null = null;
    const evaluatedContainers: EcoPlazaLiveContext["containersSummary"]["criticalContainers"] =
      [];

    const telemetryResults = await Promise.allSettled(
      containers.map(async (c) => {
        try {
          const tel = await sensorModule.getLatestTelemetry(c.id);
          return { container: c, telemetry: tel };
        } catch {
          return { container: c, telemetry: null };
        }
      }),
    );

    for (const result of telemetryResults) {
      if (result.status === "fulfilled") {
        const { container, telemetry } = result.value;
        const fillPercentage =
          typeof telemetry?.fillLevelPercent === "number" &&
          !Number.isNaN(telemetry.fillLevelPercent)
            ? telemetry.fillLevelPercent
            : 0;

        if (telemetry) {
          onlineSensors++;
          if (telemetry.recordedAt) {
            if (
              !latestTimestamp ||
              new Date(telemetry.recordedAt) > new Date(latestTimestamp)
            ) {
              latestTimestamp = telemetry.recordedAt;
            }
          }
        }

        const alertLevel = calculateAlertLevel(fillPercentage);

        evaluatedContainers.push({
          containerId: container.code || container.id,
          location:
            (container as { location?: string }).location ||
            "Pasto, Nariño (Centro de Acopio)",
          materialType:
            containerMaterialMap.get(container.id) ||
            (container as { category?: string }).category ||
            "Residuos Mixtos",
          fillPercentage,
          alertLevel,
        });
      }
    }

    evaluatedContainers.sort((a, b) => b.fillPercentage - a.fillPercentage);

    return {
      inventorySummary,
      containersSummary: {
        totalContainers: containers.length,
        criticalContainers: evaluatedContainers,
      },
      iotTelemetrySummary: {
        onlineSensors,
        totalSensors: containers.length,
        lastUpdateIso: latestTimestamp,
      },
    };
  } catch {
    return fallbackContext;
  }
}

/**
 * Genera el prompt de sistema maestro institucional enriquecido para Gemini.
 */
export function buildSystemInstruction(context: EcoPlazaLiveContext): string {
  const { inventorySummary, containersSummary, iotTelemetrySummary } = context;

  // 1. Identidad institucional
  const identitySection = [
    "### ROL E IDENTIDAD INSTITUCIONAL",
    "Eres el Asistente Estratégico y Analista de Operaciones de EcoPlaza Smart Waste Platform en Pasto, Nariño, Colombia.",
    "Tu misión es optimizar la gestión integral de residuos sólidos valorizables, monitorear la infraestructura IoT y apoyar la toma de decisiones comerciales y logísticas del centro de acopio.",
  ].join("\n");

  // 2. Moneda y Unidades
  const unitsSection = [
    "### MONEDA Y UNIDADES DE MEDIDA",
    "- Moneda oficial: Pesos Colombianos (COP). Expresa los valores económicos con símbolo y denominación COP.",
    "- Pesaje de residuos: Kilogramos (kg) o toneladas (t).",
    "- Capacidad y volumen: Porcentajes de llenado (%) y distancias ultrasónicas en centímetros (cm).",
  ].join("\n");

  // 3. Inventario Disponible y Valorización
  const hasInventory = inventorySummary.totalWeightKg > 0;
  const breakdownLines = inventorySummary.breakdownByCategory.map((item) => {
    const label = getCategoryLabelEs(item.category);
    return `  • ${label}: ${formatWeightKg(item.weightKg)} — Valor estimado: ${formatCurrencyCop(item.estimatedValueCop)} COP`;
  });

  const inventorySection = [
    "### ESTADO EN VIVO DEL INVENTARIO (BODEGA Y CENTRO DE ACOPIO)",
    hasInventory
      ? [
          `• Peso total disponible: ${formatWeightKg(inventorySummary.totalWeightKg)}.`,
          `• Valoración económica estimada total: ${formatCurrencyCop(inventorySummary.totalEstimatedValueCop)} COP.`,
          "• Desglose disponible por categoría:",
          ...breakdownLines,
        ].join("\n")
      : "• Actualmente no se registra inventario disponible en bodega (0 kg / $ 0 COP). Todo el material registrado ha sido comercializado o despachado.",
  ].join("\n");

  // 4. Telemetría y Contenedores
  const criticalList = containersSummary.criticalContainers.filter(
    (c) => c.alertLevel === "critical" || c.fillPercentage >= 80,
  );
  const warningList = containersSummary.criticalContainers.filter(
    (c) =>
      c.alertLevel === "warning" ||
      (c.fillPercentage >= 60 && c.fillPercentage < 80),
  );

  const criticalLines = criticalList.map(
    (c) =>
      `  🚨 Contenedor ${c.containerId} [${c.materialType}]: ${c.fillPercentage}% de llenado — Ubicación: ${c.location} | ALERTA CRÍTICA: Riesgo inminente de desbordamiento. Prioridad de vaciado inmediata.`,
  );

  const warningLines = warningList.map(
    (c) =>
      `  ⚠️ Contenedor ${c.containerId} [${c.materialType}]: ${c.fillPercentage}% de llenado — Ubicación: ${c.location} | Advertencia: Programar recolección próxima.`,
  );

  const telemetrySection = [
    "### TELEMETRÍA IOT Y CAPACIDAD DE CONTENEDORES (NODOS ESP32 + SENSORES HC-SR04)",
    `• Red de sensores IoT: ${iotTelemetrySummary.onlineSensors} de ${iotTelemetrySummary.totalSensors} dispositivos en línea.`,
    `• Última telemetría registrada: ${iotTelemetrySummary.lastUpdateIso || "Sin registros recientes"}.`,
    `• Total de contenedores monitoreados: ${containersSummary.totalContainers}.`,
    "",
    criticalList.length > 0
      ? [
          "⚠️ CONTENEDORES EN ESTADO CRÍTICO (Llenado >= 80% medido por sensores ultrasónicos HC-SR04 de nodos ESP32):",
          ...criticalLines,
          "Acción obligatoria: Recomendar despacho urgente de rutas logísticas y vaciado de contenedores para prevenir desbordamientos.",
        ].join("\n")
      : "• Estado de capacidad: Todos los contenedores operan bajo niveles normales de capacidad (< 80%). No hay alertas críticas de desbordamiento activas.",
    ...(warningLines.length > 0
      ? ["", "CONTENEDORES EN ADVERTENCIA (Llenado entre 60% y 79%):", ...warningLines]
      : []),
  ].join("\n");

  // 5. Comportamiento, Tono y Recomendaciones
  const behaviorSection = [
    "### DIRECTRICES DE COMPORTAMIENTO Y TONO",
    "- Tono profesional, técnico, comercial y ecológico.",
    "- Ventas estratégicas: Si hay inventarios acumulados con valor comercial significativo, sugiere la liquidación oportuna hacia recicladores o transformadores autorizados.",
    "- Logística preventiva: Si hay contenedores críticos (>= 80%), prioriza advertir al operador sobre el riesgo de desbordamiento y solicita despacho de rutas de recolección.",
    "- Contexto regional: Ten en cuenta el entorno de Pasto, Nariño, y las dinámicas locales de aprovechamiento de residuos.",
  ].join("\n");

  // 6. Restricciones Estrictas
  const restrictionsSection = [
    "### RESTRICCIONES ESTRICTAS Y POLÍTICA DE VERACIDAD",
    "- PROHIBIDO INVENTAR O ALUCINAR DATOS: Limítate estrictamente a las cifras y hechos inyectados en este contexto.",
    "- Si el usuario solicita información sobre inventario o sensores y estos están en 0 o vacíos, indícalo con transparencia técnica.",
    "- No asumas transacciones o métricas que no estén registradas en el sistema.",
  ].join("\n");

  return [
    identitySection,
    unitsSection,
    inventorySection,
    telemetrySection,
    behaviorSection,
    restrictionsSection,
  ].join("\n\n");
}

/**
 * Método de conveniencia que extrae el contexto en vivo y construye
 * la instrucción de sistema enriquecida para el LLM.
 */
export async function getEnrichedSystemPrompt(): Promise<string> {
  const context = await fetchEcoPlazaLiveContext();
  return buildSystemInstruction(context);
}

