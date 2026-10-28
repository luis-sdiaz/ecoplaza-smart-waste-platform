import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSystemInstruction,
  calculateAlertLevel,
  fetchEcoPlazaLiveContext,
  formatCurrencyCop,
  formatWeightKg,
  getCategoryLabelEs,
  getEnrichedSystemPrompt,
  setEcoPlazaLiveContextProvider,
  type EcoPlazaLiveContext,
} from "../src/services/assistantContextService.ts";
import * as wasteService from "../src/services/wasteService.ts";
import * as containerService from "../src/services/containerService.ts";
import * as sensorService from "../src/services/sensorService.ts";
import * as salesService from "../src/services/salesService.ts";

vi.mock("../src/services/wasteService.ts", () => ({
  listAvailableWasteRecords: vi.fn(),
}));

vi.mock("../src/services/containerService.ts", () => ({
  listContainers: vi.fn(),
}));

vi.mock("../src/services/sensorService.ts", () => ({
  getLatestTelemetry: vi.fn(),
}));

vi.mock("../src/services/salesService.ts", () => ({
  listSales: vi.fn(),
}));

describe("assistantContextService - Inyección de Contexto Operativo y Comercial para Gemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEcoPlazaLiveContextProvider(null);
  });

  it("1. Debe generar el systemInstruction completo con formato COP y pesos en kg cuando hay datos reales de inventario y sensores", () => {
    const mockContext: EcoPlazaLiveContext = {
      inventorySummary: {
        totalWeightKg: 1450.5,
        totalEstimatedValueCop: 1740600,
        breakdownByCategory: [
          {
            category: "recyclable",
            weightKg: 1000.5,
            estimatedValueCop: 1200600,
          },
          {
            category: "organic",
            weightKg: 450,
            estimatedValueCop: 540000,
          },
        ],
      },
      containersSummary: {
        totalContainers: 2,
        criticalContainers: [
          {
            containerId: "CTR-01",
            location: "Zona Norte - Acopio Pasto",
            materialType: "Reciclables",
            fillPercentage: 72,
            alertLevel: "warning",
          },
        ],
      },
      iotTelemetrySummary: {
        onlineSensors: 2,
        totalSensors: 2,
        lastUpdateIso: "2026-10-27T18:30:00.000Z",
      },
    };

    const instruction = buildSystemInstruction(mockContext);

    // Verificación de formato monetario y unidades colombianas
    expect(instruction).toContain("COP");
    expect(instruction).toContain("kg");
    expect(instruction).toContain("cm");
    expect(instruction).toContain("%");

    // Verificación de inventario valorizado
    expect(instruction).toContain("1.450,5 kg");
    expect(instruction).toContain("1.740.600");
    expect(instruction).toContain("Reciclables");
    expect(instruction).toContain("Orgánicos");

    // Verificación de telemetría IoT
    expect(instruction).toContain("2 de 2 dispositivos en línea");
    expect(instruction).toContain("ESP32");
    expect(instruction).toContain("HC-SR04");
  });

  it("2. Debe destacar adecuadamente alertas críticas cuando un contenedor supera el umbral del 80% de llenado", () => {
    const mockContextWithCritical: EcoPlazaLiveContext = {
      inventorySummary: {
        totalWeightKg: 300,
        totalEstimatedValueCop: 360000,
        breakdownByCategory: [
          { category: "organic", weightKg: 300, estimatedValueCop: 360000 },
        ],
      },
      containersSummary: {
        totalContainers: 2,
        criticalContainers: [
          {
            containerId: "CTR-CRITICAL-99",
            location: "Plaza de Mercado El Potrerillo, Pasto",
            materialType: "Orgánicos",
            fillPercentage: 92.5,
            alertLevel: "critical",
          },
          {
            containerId: "CTR-NORMAL-01",
            location: "Centro de Acopio Central",
            materialType: "Reciclables",
            fillPercentage: 45,
            alertLevel: "normal",
          },
        ],
      },
      iotTelemetrySummary: {
        onlineSensors: 2,
        totalSensors: 2,
        lastUpdateIso: "2026-10-27T19:00:00.000Z",
      },
    };

    const instruction = buildSystemInstruction(mockContextWithCritical);

    // Debe contener el bloque de alerta crítica y el contenedor específico
    expect(instruction).toContain("CONTENEDORES EN ESTADO CRÍTICO (Llenado >= 80%");
    expect(instruction).toContain("CTR-CRITICAL-99");
    expect(instruction).toContain("92.5% de llenado");
    expect(instruction).toContain("Plaza de Mercado El Potrerillo, Pasto");
    expect(instruction).toContain("Riesgo inminente de desbordamiento");
    expect(instruction).toContain("Prioridad de vaciado inmediata");
    expect(instruction).toContain("Recomendar despacho urgente de rutas logísticas");

    // Debe incluir recomendaciones preventivas
    expect(instruction).toContain("Logística preventiva");
  });

  it("3. Debe generar un prompt válido con valores en cero (fallback seguro) cuando la base de datos esté vacía o los servicios retornen listas vacías", () => {
    const emptyContext: EcoPlazaLiveContext = {
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

    const instruction = buildSystemInstruction(emptyContext);

    // No debe contener NaN, null ni undefined como texto espurio
    expect(instruction).not.toContain("NaN");
    expect(instruction).not.toContain("undefined");
    expect(instruction).toContain("Actualmente no se registra inventario disponible en bodega (0 kg / $ 0 COP)");
    expect(instruction).toContain("Todos los contenedores operan bajo niveles normales de capacidad (< 80%)");
    expect(instruction).toContain("PROHIBIDO INVENTAR O ALUCINAR DATOS");
  });

  it("4. Debe manejar rechazos o errores de red en las consultas de datos sin colapsar, entregando un contexto resiliente de contingencia", async () => {
    // Simular caídas de red o excepciones en los servicios de Supabase
    vi.mocked(wasteService.listAvailableWasteRecords).mockRejectedValue(
      new Error("Database connection refused"),
    );
    vi.mocked(containerService.listContainers).mockRejectedValue(
      new Error("Network timeout"),
    );
    vi.mocked(salesService.listSales).mockRejectedValue(
      new Error("Service unavailable"),
    );

    // La función jamás debe lanzar una excepción no controlada
    const context = await fetchEcoPlazaLiveContext();

    expect(context).toBeDefined();
    expect(context.inventorySummary.totalWeightKg).toBe(0);
    expect(context.inventorySummary.totalEstimatedValueCop).toBe(0);
    expect(context.containersSummary.totalContainers).toBe(0);
    expect(context.containersSummary.criticalContainers).toEqual([]);
    expect(context.iotTelemetrySummary.onlineSensors).toBe(0);
    expect(context.iotTelemetrySummary.lastUpdateIso).toBeNull();

    // El prompt de sistema enriquecido también debe resolverse limpiamente
    const prompt = await getEnrichedSystemPrompt();
    expect(prompt).toContain("EcoPlaza Smart Waste Platform");
  });

  it("5. Debe validar que la instrucción de sistema contenga la identidad corporativa de EcoPlaza y ubicación en Pasto, Nariño", () => {
    const dummyContext: EcoPlazaLiveContext = {
      inventorySummary: {
        totalWeightKg: 100,
        totalEstimatedValueCop: 100000,
        breakdownByCategory: [],
      },
      containersSummary: {
        totalContainers: 1,
        criticalContainers: [],
      },
      iotTelemetrySummary: {
        onlineSensors: 1,
        totalSensors: 1,
        lastUpdateIso: null,
      },
    };

    const instruction = buildSystemInstruction(dummyContext);

    expect(instruction).toContain("EcoPlaza Smart Waste Platform");
    expect(instruction).toContain("Pasto, Nariño, Colombia");
    expect(instruction).toContain("Asistente Estratégico y Analista de Operaciones");
  });

  it("6. Debe consolidar correctamente el contexto en vivo mediante fetchEcoPlazaLiveContext con datos simulados", async () => {
    vi.mocked(wasteService.listAvailableWasteRecords).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "w-1",
          recordNumber: "REC-001",
          containerId: "ctr-1",
          category: "recyclable",
          weightKg: 200,
          registeredAt: "2026-10-27T10:00:00Z",
          status: "available",
        },
      ],
    });

    vi.mocked(salesService.listSales).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "s-1",
          buyerId: "b-1",
          wasteRecordId: "w-1",
          buyerName: "Recicladora Nariño",
          wasteRecordNumber: "REC-001",
          category: "recyclable",
          weightKg: 500,
          unitPrice: 1500,
          totalValue: 750000,
          soldAt: "2026-10-25T14:00:00Z",
        },
      ],
    });

    vi.mocked(containerService.listContainers).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "ctr-1",
          code: "CTR-PLASTIC-01",
          createdAt: "2026-09-01T00:00:00Z",
        },
        {
          id: "ctr-2",
          code: "CTR-ORGANIC-02",
          createdAt: "2026-09-01T00:00:00Z",
        },
      ],
    });

    vi.mocked(sensorService.getLatestTelemetry).mockImplementation(
      async (containerId: string) => {
        if (containerId === "ctr-1") {
          return {
            id: "tel-1",
            containerId: "ctr-1",
            fillLevelPercent: 88,
            batteryLevelPercent: 95,
            temperatureCelsius: 18.5,
            recordedAt: "2026-10-27T18:00:00.000Z",
          };
        }
        if (containerId === "ctr-2") {
          return {
            id: "tel-2",
            containerId: "ctr-2",
            fillLevelPercent: 35,
            batteryLevelPercent: 80,
            temperatureCelsius: 19.0,
            recordedAt: "2026-10-27T18:05:00.000Z",
          };
        }
        return null;
      },
    );

    const context = await fetchEcoPlazaLiveContext();

    expect(context.inventorySummary.totalWeightKg).toBe(200);
    expect(context.inventorySummary.totalEstimatedValueCop).toBe(300000); // 200 kg * 1500 COP/kg
    expect(context.containersSummary.totalContainers).toBe(2);
    expect(context.iotTelemetrySummary.onlineSensors).toBe(2);
    expect(context.iotTelemetrySummary.lastUpdateIso).toBe("2026-10-27T18:05:00.000Z");

    const criticalContainer = context.containersSummary.criticalContainers.find(
      (c) => c.containerId === "CTR-PLASTIC-01",
    );
    expect(criticalContainer).toBeDefined();
    expect(criticalContainer?.alertLevel).toBe("critical");
    expect(criticalContainer?.fillPercentage).toBe(88);

    const normalContainer = context.containersSummary.criticalContainers.find(
      (c) => c.containerId === "CTR-ORGANIC-02",
    );
    expect(normalContainer).toBeDefined();
    expect(normalContainer?.alertLevel).toBe("normal");
    expect(normalContainer?.fillPercentage).toBe(35);
  });

  it("7. Permite inyectar proveedores personalizados con setEcoPlazaLiveContextProvider", async () => {
    const customProviderMock = vi.fn().mockResolvedValue({
      inventorySummary: {
        totalWeightKg: 999,
        totalEstimatedValueCop: 888,
        breakdownByCategory: [],
      },
      containersSummary: {
        totalContainers: 5,
        criticalContainers: [],
      },
      iotTelemetrySummary: {
        onlineSensors: 5,
        totalSensors: 5,
        lastUpdateIso: "2026-10-27T20:00:00.000Z",
      },
    });

    setEcoPlazaLiveContextProvider(customProviderMock);

    const context = await fetchEcoPlazaLiveContext();
    expect(customProviderMock).toHaveBeenCalledTimes(1);
    expect(context.inventorySummary.totalWeightKg).toBe(999);
    expect(context.containersSummary.totalContainers).toBe(5);

    // Restablecer proveedor
    setEcoPlazaLiveContextProvider(null);
  });

  it("8. Valida funciones auxiliares de formato y categorización", () => {
    expect(formatCurrencyCop(1500000)).toBe("$ 1.500.000");
    expect(formatWeightKg(1250.75)).toBe("1.250,75 kg");
    expect(getCategoryLabelEs("organic")).toBe("Orgánicos");
    expect(getCategoryLabelEs("recyclable")).toBe("Reciclables");
    expect(getCategoryLabelEs("nonRecyclable")).toBe("No aprovechables");
    expect(calculateAlertLevel(85)).toBe("critical");
    expect(calculateAlertLevel(70)).toBe("warning");
    expect(calculateAlertLevel(40)).toBe("normal");
  });
});
