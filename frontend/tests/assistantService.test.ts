import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAssistantAnalyticsContext,
  classifyAssistantPrompt,
  formatAssistantGeneralResponse,
  formatAssistantInventoryResponse,
  formatAssistantProjectionResponse,
  formatAssistantSalesResponse,
  formatIoTFleetResponse,
  generateAssistantResponse,
  generateAssistantResponseWithProvider,
  getLastAssistantProvider,
  setAssistantDataProvider,
  setAssistantTelemetryProvider,
  type AssistantAnalyticsContext,
} from "../src/services/assistantService.ts";
import { geminiAiService } from "../src/services/geminiAiService.ts";
import type { ContainerTelemetrySnapshot } from "../src/services/iotAnalyticsService.ts";
import type { Container } from "../src/services/containerService.ts";
import type { SaleHistoryItem } from "../src/services/salesService.ts";
import type { RemoteWasteRecord } from "../src/services/wasteService.ts";

process.env.TZ = "America/Bogota";

const mockContainers: Container[] = [
  {
    id: "ctr-1",
    code: "CTR-01",
    createdAt: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "ctr-2",
    code: "CTR-02",
    createdAt: "2026-09-01T12:00:00.000Z",
  },
];

const mockWasteRecords: RemoteWasteRecord[] = [
  {
    id: "waste-1",
    recordNumber: "1",
    containerId: "ctr-1",
    category: "recyclable",
    weightKg: 100,
    registeredAt: "2026-09-10T12:00:00.000-05:00",
    status: "available",
  },
  {
    id: "waste-2",
    recordNumber: "2",
    containerId: "ctr-2",
    category: "organic",
    weightKg: 80,
    registeredAt: "2026-10-01T12:00:00.000-05:00",
    status: "available",
  },
  {
    id: "waste-3",
    recordNumber: "3",
    containerId: "ctr-1",
    category: "nonRecyclable",
    weightKg: 20,
    registeredAt: "2026-10-15T12:00:00.000-05:00",
    status: "available",
  },
  {
    id: "waste-4",
    recordNumber: "4",
    containerId: "ctr-1",
    category: "recyclable",
    weightKg: 50,
    registeredAt: "2026-09-05T12:00:00.000-05:00",
    status: "sold",
  },
];

const mockSales: SaleHistoryItem[] = [
  {
    id: "sale-1",
    wasteRecordId: "waste-4",
    wasteRecordNumber: "4",
    buyerId: "buyer-1",
    buyerName: "Comprador Uno",
    category: "recyclable",
    weightKg: 50,
    unitPrice: 2000,
    totalValue: 100000,
    soldAt: "2026-09-20T15:00:00.000Z",
  },
  {
    id: "sale-2",
    wasteRecordId: "waste-prev",
    wasteRecordNumber: "0",
    buyerId: "buyer-2",
    buyerName: "Comprador Dos",
    category: "organic",
    weightKg: 50,
    unitPrice: 1000,
    totalValue: 50000,
    soldAt: "2026-09-25T15:00:00.000Z",
  },
];

const fixedNow = new Date("2026-10-20T12:00:00.000-05:00");

test("classifies prompt intents accurately", () => {
  // Sales
  assert.equal(
    classifyAssistantPrompt("📊 Analizar tendencias de ventas de este mes"),
    "sales",
  );
  assert.equal(
    classifyAssistantPrompt("¿Cuáles son los ingresos totales?"),
    "sales",
  );
  assert.equal(
    classifyAssistantPrompt("Reporte de facturación comercial"),
    "sales",
  );

  // Inventory
  assert.equal(
    classifyAssistantPrompt("♻️ Identificar residuos estancados en inventario"),
    "inventory",
  );
  assert.equal(
    classifyAssistantPrompt("Stock disponible en contenedores"),
    "inventory",
  );
  assert.equal(
    classifyAssistantPrompt("Materiales con mayor tiempo de almacenamiento"),
    "inventory",
  );

  // Projections
  assert.equal(
    classifyAssistantPrompt("📈 Proyectar ingresos basados en stock actual"),
    "projection",
  );
  assert.equal(
    classifyAssistantPrompt("Estimación de ingresos según el inventario"),
    "projection",
  );

  // General
  assert.equal(classifyAssistantPrompt("Hola, ¿cómo estás?"), "general");
  assert.equal(
    classifyAssistantPrompt("¿Cuál es el estado general del sistema?"),
    "general",
  );
});

test("builds accurate analytical context from platform entities", () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );

  assert.equal(context.totalContainersCount, 2);
  assert.equal(context.totalWasteRecords, 4);
  assert.equal(context.totalRegisteredWeightKg, 250); // 100 + 80 + 20 + 50
  assert.equal(context.availableWeightKg, 200); // 100 + 80 + 20
  assert.equal(context.availableWeightByCategory.recyclable, 100);
  assert.equal(context.availableWeightByCategory.organic, 80);
  assert.equal(context.availableWeightByCategory.nonRecyclable, 20);

  assert.equal(context.totalSalesCount, 2);
  assert.equal(context.grossRevenueCop, 150000); // 100000 + 50000
  // Average selling price: 150000 / (50 + 50) = 1500 COP/kg
  assert.equal(context.averagePricePerKgCop, 1500);

  // Top category: recyclable has 100000 gross revenue vs organic 50000
  assert.notEqual(context.topPerformingCategory, null);
  assert.equal(context.topPerformingCategory?.category, "recyclable");
  assert.equal(context.topPerformingCategory?.grossSalesValue, 100000);
  assert.equal(context.topPerformingCategory?.salesCount, 1);
  assert.equal(context.topPerformingCategory?.soldWeightKg, 50);

  // Oldest available inventory: waste-1 was registered on 2026-09-10 (40 days before 2026-10-20)
  assert.equal(context.oldestAvailableInventory.length, 3);
  assert.equal(context.oldestAvailableInventory[0].reference, "RES-001");
  assert.equal(context.oldestAvailableInventory[0].containerCode, "CTR-01");
  assert.equal(context.oldestAvailableInventory[0].ageDays, 40);
});

test("generates sales response with transactions, formatted COP, and top category", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );

  const response = await generateAssistantResponse(
    "Analizar tendencias de ventas de este mes",
    context,
  );

  assert.match(response, /2 ventas registradas/);
  assert.match(response, /\$ 150\.000/);
  assert.match(response, /COP/);
  assert.match(response, /Reciclables/);
  assert.match(response, /66\.7%/);
});

test("generates inventory response with available weight and aging details", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );

  const response = await generateAssistantResponse(
    "Identificar residuos estancados en inventario",
    context,
  );

  assert.match(response, /200 kg/);
  assert.match(response, /Orgánicos: 80 kg/);
  assert.match(response, /Reciclables: 100 kg/);
  assert.match(response, /No aprovechables: 20 kg/);
  assert.match(response, /RES-001/);
  assert.match(response, /40 días de antigüedad/);
});

test("generates projection response by multiplying available weight with average price", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );

  const response = await generateAssistantResponse(
    "Proyectar ingresos basados en stock actual",
    context,
  );

  // Available: 200 kg * 1500 COP/kg = 300000 COP
  assert.match(response, /200 kg/);
  assert.match(response, /\$ 1\.500.*COP\/kg/);
  assert.match(response, /\$ 300\.000.*COP/);
});

test("generates general operational summary with containers, waste volume, and sales", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );

  const response = await generateAssistantResponse(
    "¿Cuál es el estado general?",
    context,
  );

  assert.match(response, /2 contenedores registrados/);
  assert.match(response, /4 entradas/);
  assert.match(response, /250 kg/);
  assert.match(response, /200 kg/);
  assert.match(response, /2 ventas/);
  assert.match(response, /\$ 150\.000.*COP/);
});

test("handles empty datasets safely without NaN or crashes", async () => {
  const emptyContext: AssistantAnalyticsContext = {
    totalContainersCount: 0,
    totalWasteRecords: 0,
    totalRegisteredWeightKg: 0,
    availableWeightKg: 0,
    availableWeightByCategory: { organic: 0, recyclable: 0, nonRecyclable: 0 },
    totalSalesCount: 0,
    grossRevenueCop: 0,
    averagePricePerKgCop: null,
    topPerformingCategory: null,
    oldestAvailableInventory: [],
  };

  const salesRes = formatAssistantSalesResponse(emptyContext);
  assert.match(salesRes, /0 ventas registradas/);
  assert.match(salesRes, /\$ 0/);

  const invRes = formatAssistantInventoryResponse(emptyContext);
  assert.match(invRes, /0 kg/);
  assert.match(invRes, /No hay residuos estancados/);

  const projRes = formatAssistantProjectionResponse(emptyContext);
  assert.match(projRes, /Sin datos suficientes/);

  const genRes = formatAssistantGeneralResponse(emptyContext);
  assert.match(genRes, /0 contenedores/);
  assert.match(genRes, /0 entradas/);
});

test("supports custom data provider for seamless integration and mocking", async () => {
  const customContext: AssistantAnalyticsContext = {
    totalContainersCount: 5,
    totalWasteRecords: 10,
    totalRegisteredWeightKg: 500,
    availableWeightKg: 300,
    availableWeightByCategory: { organic: 100, recyclable: 150, nonRecyclable: 50 },
    totalSalesCount: 3,
    grossRevenueCop: 600000,
    averagePricePerKgCop: 3000,
    topPerformingCategory: {
      category: "recyclable",
      salesCount: 2,
      soldWeightKg: 150,
      grossSalesValue: 450000,
      revenuePercentage: 75,
    },
    oldestAvailableInventory: [],
  };

  setAssistantDataProvider(() => Promise.resolve(customContext));

  try {
    // Call generateAssistantResponse with single argument
    const salesResponse = await generateAssistantResponse("Tendencias de ventas");
    assert.match(salesResponse, /3 ventas registradas/);
    assert.match(salesResponse, /\$ 600\.000/);

    const projResponse = await generateAssistantResponse("Proyectar ingresos");
    // 300 kg * 3000 = 900000 COP
    assert.match(projResponse, /\$ 900\.000/);
  } finally {
    setAssistantDataProvider(null);
  }
});

const mockIoTTelemetrySnapshots: ContainerTelemetrySnapshot[] = [
  {
    containerId: "ctr-uuid-1",
    containerName: "CTR-PLAZA-CENTRAL",
    fillLevel: 95,
    batteryLevel: 14,
    temperature: 22,
    updatedAt: "2026-10-21T08:00:00.000Z",
  },
  {
    containerId: "ctr-uuid-2",
    containerName: "CTR-MERCADO",
    fillLevel: 82,
    batteryLevel: 65,
    temperature: 24,
    updatedAt: "2026-10-21T08:00:00.000Z",
  },
  {
    containerId: "ctr-uuid-3",
    containerName: "CTR-PARQUE",
    fillLevel: 40,
    batteryLevel: 88,
    temperature: 20,
    updatedAt: "2026-10-21T08:00:00.000Z",
  },
];

test("formatIoTFleetResponse: a) retorna null cuando la consulta no está relacionada con IoT o sensores", () => {
  const resultSales = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "¿cuáles son las ventas del mes?",
  );
  assert.equal(resultSales, null);

  const resultInventory = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "mostrar residuos estancados en inventario",
  );
  assert.equal(resultInventory, null);

  const resultGeneral = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "hola, ¿cómo estás?",
  );
  assert.equal(resultGeneral, null);
});

test("formatIoTFleetResponse: b) genera respuesta general de flota en español e inglés", () => {
  const resEs = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "¿cuál es el estado de los sensores?",
    "es",
  );
  assert.ok(resEs !== null);
  assert.match(resEs, /Diagnóstico General de Flota y Sensores IoT/);
  assert.match(resEs, /Se monitorean 3 contenedor\(es\)/);
  assert.match(resEs, /promedio de 72\.3%/);

  const resEn = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "what is the fleet status?",
    "en",
  );
  assert.ok(resEn !== null);
  assert.match(resEn, /General IoT Fleet and Sensors Diagnostic/);
  assert.match(resEn, /Monitoring 3 container\(s\)/);
  assert.match(resEn, /average fill level of 72\.3%/);
});

test("formatIoTFleetResponse: c) detalla contenedores críticos en la cola de despacho ante recolección urgente", () => {
  const resUrgEs = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "¿hay contenedores que requieran recolección urgente?",
    "es",
  );
  assert.ok(resUrgEs !== null);
  assert.match(resUrgEs, /Despacho y Recolección Urgente IoT/);
  assert.match(resUrgEs, /Contenedores que requieren atención \(2\):/);
  assert.match(resUrgEs, /CTR-PLAZA-CENTRAL: 95% de llenado \[Inmediata/);
  assert.match(resUrgEs, /CTR-MERCADO: 82% de llenado \[Programada/);

  const resUrgEn = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "urgent collection dispatch list",
    "en",
  );
  assert.ok(resUrgEn !== null);
  assert.match(resUrgEn, /IoT Urgent Dispatch and Collection/);
  assert.match(resUrgEn, /Containers requiring attention \(2\):/);
  assert.match(resUrgEn, /CTR-PLAZA-CENTRAL: 95% fill level \[Immediate/);
  assert.match(resUrgEn, /CTR-MERCADO: 82% fill level \[Scheduled/);
});

test("formatIoTFleetResponse: d) alerta sobre niveles bajos de batería (< 20%)", () => {
  const resBat = formatIoTFleetResponse(
    mockIoTTelemetrySnapshots,
    "¿cuál es el estado de las baterías?",
    "es",
  );
  assert.ok(resBat !== null);
  assert.match(resBat, /Estado de Baterías de Sensores IoT/);
  assert.match(resBat, /Sensores con batería baja \(< 20%\): 1 dispositivo\(s\)/);
  assert.match(resBat, /CTR-PLAZA-CENTRAL: 14% de batería/);

  // Caso con baterías saludables en toda la flota
  const healthyFleet: ContainerTelemetrySnapshot[] = [
    {
      containerId: "ctr-h-1",
      containerName: "CTR-A",
      fillLevel: 50,
      batteryLevel: 90,
      updatedAt: "2026-10-21T08:00:00.000Z",
    },
  ];
  const resHealthy = formatIoTFleetResponse(
    healthyFleet,
    "revisar baterias de los sensores",
    "es",
  );
  assert.ok(resHealthy !== null);
  assert.match(resHealthy, /Todos los dispositivos \(1 sensores monitoreados\) operan con niveles de batería óptimos/);
});

test("formatIoTFleetResponse: e) responde adecuadamente ante una flota sin telemetría (lista vacía)", () => {
  const emptyFleet: ContainerTelemetrySnapshot[] = [];

  const resGeneral = formatIoTFleetResponse(emptyFleet, "telemetría de la flota", "es");
  assert.ok(resGeneral !== null);
  assert.match(resGeneral, /No hay contenedores con telemetría activa en la flota/);

  const resBat = formatIoTFleetResponse(emptyFleet, "baterías de sensores", "es");
  assert.ok(resBat !== null);
  assert.match(resBat, /No hay sensores con telemetría activa/);

  const resUrg = formatIoTFleetResponse(emptyFleet, "despacho crítico", "es");
  assert.ok(resUrg !== null);
  assert.match(resUrg, /No hay contenedores con telemetría activa/);
});

test("generateAssistantResponse: responde con análisis IoT cuando se consulta sobre sensores y telemetría", async () => {
  // Con snapshots provistos directamente
  const responseWithOverride = await generateAssistantResponse(
    "¿qué contenedores requieren recolección urgente?",
    undefined,
    mockIoTTelemetrySnapshots,
    "es",
  );
  assert.match(responseWithOverride, /Despacho y Recolección Urgente IoT/);
  assert.match(responseWithOverride, /CTR-PLAZA-CENTRAL/);

  // Con customTelemetryProvider
  setAssistantTelemetryProvider(() => Promise.resolve(mockIoTTelemetrySnapshots));
  try {
    const responseWithProvider = await generateAssistantResponse(
      "¿cuál es el estado de las baterías?",
    );
    assert.match(responseWithProvider, /Estado de Baterías de Sensores IoT/);
    assert.match(responseWithProvider, /14% de batería/);
  } finally {
    setAssistantTelemetryProvider(null);
  }
});

test("generateAssistantResponseWithProvider: consulta exitosa a Gemini cuando está configurado", async () => {
  geminiAiService.configure({ apiKey: "AIzaSyMockKeyForTest" });
  const originalGenerate = geminiAiService.generateText;
  geminiAiService.generateText = async () =>
    "Respuesta generada por Gemini AI 1.5 Flash";

  try {
    const result = await generateAssistantResponseWithProvider(
      "¿Cómo optimizar reciclaje?",
    );
    assert.strictEqual(result.provider, "gemini");
    assert.strictEqual(result.content, "Respuesta generada por Gemini AI 1.5 Flash");
    assert.strictEqual(getLastAssistantProvider(), "gemini");
  } finally {
    geminiAiService.generateText = originalGenerate;
    geminiAiService.configure({ apiKey: "" });
  }
});

test("generateAssistantResponseWithProvider: fallback local cuando Gemini arroja error 429 de cuota", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );
  geminiAiService.configure({ apiKey: "AIzaSyMockKeyForTest" });
  const originalGenerate = geminiAiService.generateText;
  geminiAiService.generateText = async () => {
    throw new Error("Cuota de Gemini excedida (429): Resource exhausted");
  };

  try {
    const result = await generateAssistantResponseWithProvider(
      "Tendencias de ventas",
      context,
    );
    assert.strictEqual(result.provider, "local_fallback");
    assert.match(result.content, /rendimiento|ventas/i);
    assert.strictEqual(getLastAssistantProvider(), "local_fallback");
  } finally {
    geminiAiService.generateText = originalGenerate;
    geminiAiService.configure({ apiKey: "" });
  }
});

test("generateAssistantResponseWithProvider: fallback local cuando isConfigured() es falso", async () => {
  const context = buildAssistantAnalyticsContext(
    mockWasteRecords,
    mockSales,
    mockContainers,
    fixedNow,
  );
  geminiAiService.configure({ apiKey: "" });
  const result = await generateAssistantResponseWithProvider(
    "Proyectar ingresos",
    context,
  );
  assert.strictEqual(result.provider, "local_fallback");
  assert.match(result.content, /proyección|stock/i);
});


