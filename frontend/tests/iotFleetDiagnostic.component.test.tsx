import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import IoTFleetDiagnosticCard from "../src/components/IoTFleetDiagnosticCard";
import type { Container } from "../src/services/containerService";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  getContainers: mocks.listContainers,
}));

vi.mock("../src/services/sensorService", () => ({
  getLatestTelemetry: mocks.getLatestTelemetry,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "iotDiagnostic.cardTitle": "Diagnóstico Predictivo IoT",
        "iotDiagnostic.cardSubtitle": "Auditoría en tiempo real del parque de sensores y recomendaciones inteligentes",
        "iotDiagnostic.auditButton": "Auditar flota IoT",
        "iotDiagnostic.auditingButton": "Auditando...",
        "iotDiagnostic.refreshButton": "Actualizar auditoría",
        "iotDiagnostic.totalMonitored": "Total monitoreado",
        "iotDiagnostic.averageFill": "Llenado promedio",
        "iotDiagnostic.lowBattery": "Baterías bajas",
        "iotDiagnostic.urgentDispatchTitle": "Cola de recolección urgente",
        "iotDiagnostic.noUrgentDispatch": "No hay contenedores que requieran recolección inmediata.",
        "iotDiagnostic.emptyFleetTitle": "Sin datos de telemetría",
        "iotDiagnostic.emptyFleetDescription": "No hay contenedores registrados o no cuentan con lecturas de telemetría activas.",
        "iotDiagnostic.severityOptimal": "Óptimo",
        "iotDiagnostic.severityWarning": "Advertencia",
        "iotDiagnostic.severityCritical": "Crítico",
        "iotDiagnostic.severityEmpty": "Sin telemetría",
        "iotDiagnostic.immediateDispatch": "Inmediata",
        "iotDiagnostic.scheduledCollection": "Programada",
        "iotDiagnostic.fillLevelLabel": "Llenado",
      };
      return dict[key] ?? key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

describe("IoTFleetDiagnosticCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("a) Valida renderizado accesible del botón de diagnóstico y su estado inicial", () => {
    render(<IoTFleetDiagnosticCard />);

    // Región accesible con su título
    const region = screen.getByRole("region", {
      name: "Diagnóstico Predictivo IoT",
    });
    expect(region).toBeDefined();

    // Botón de auditoría inicial disponible y habilitado
    const auditButton = screen.getByRole("button", {
      name: "Auditar flota IoT",
    });
    expect(auditButton).toBeDefined();
    expect(auditButton.hasAttribute("disabled")).toBe(false);

    // Estado inicial no muestra aún métricas
    expect(screen.queryByTestId("diagnostic-total-monitored")).toBeNull();
    expect(screen.queryByTestId("diagnostic-dispatch-list")).toBeNull();
    expect(
      screen.getByText(/No hay contenedores registrados o no cuentan con lecturas/i),
    ).toBeDefined();
  });

  test("b) Valida cálculo y despliegue correcto de métricas tras invocar la auditoría", async () => {
    const mockContainers: Container[] = [
      { id: "c-1", code: "CTR-A", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "c-2", code: "CTR-B", createdAt: "2026-10-01T00:00:00.000Z" },
    ];

    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: mockContainers,
    });

    mocks.getLatestTelemetry.mockImplementation(async (id: string) => {
      if (id === "c-1") {
        return {
          id: "t-1",
          containerId: "c-1",
          fillLevelPercent: 50,
          batteryLevelPercent: 85,
          temperatureCelsius: 22,
          recordedAt: "2026-10-20T12:00:00.000Z",
        } satisfies TelemetryRecord;
      }
      return {
        id: "t-2",
        containerId: "c-2",
        fillLevelPercent: 60,
        batteryLevelPercent: 90,
        temperatureCelsius: 24,
        recordedAt: "2026-10-20T12:00:00.000Z",
      } satisfies TelemetryRecord;
    });

    render(<IoTFleetDiagnosticCard />);

    const auditButton = screen.getByRole("button", {
      name: "Auditar flota IoT",
    });
    fireEvent.click(auditButton);

    const totalMonitored = await screen.findByTestId("diagnostic-total-monitored");
    expect(totalMonitored.textContent).toBe("2");

    const averageFill = screen.getByTestId("diagnostic-average-fill");
    expect(averageFill.textContent).toBe("55%");

    const lowBattery = screen.getByTestId("diagnostic-low-battery");
    expect(lowBattery.textContent).toBe("0");

    const severityBadge = screen.getByTestId("diagnostic-severity-badge");
    expect(severityBadge.textContent).toContain("Óptimo");

    const executiveSummary = screen.getByTestId("diagnostic-executive-summary");
    expect(executiveSummary.textContent).toMatch(/Se monitorean 2 contenedor\(es\)/i);
    expect(executiveSummary.textContent).toMatch(/promedio de 55%/i);

    // El botón se actualiza a "Actualizar auditoría"
    expect(
      screen.getByRole("button", { name: "Actualizar auditoría" }),
    ).toBeDefined();
  });

  test("c) Valida visualización de la lista de despacho urgente cuando hay contenedores críticos y en advertencia", async () => {
    const mockContainers: Container[] = [
      { id: "c-crit", code: "CTR-CRITICO", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "c-warn", code: "CTR-ALERTA", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "c-norm", code: "CTR-NORMAL", createdAt: "2026-10-01T00:00:00.000Z" },
    ];

    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: mockContainers,
    });

    mocks.getLatestTelemetry.mockImplementation(async (id: string) => {
      if (id === "c-crit") {
        return {
          id: "t-crit",
          containerId: "c-crit",
          fillLevelPercent: 96,
          batteryLevelPercent: 12, // Batería baja < 20%
          temperatureCelsius: 21,
          recordedAt: "2026-10-20T12:00:00.000Z",
        } satisfies TelemetryRecord;
      }
      if (id === "c-warn") {
        return {
          id: "t-warn",
          containerId: "c-warn",
          fillLevelPercent: 82,
          batteryLevelPercent: 75,
          temperatureCelsius: 23,
          recordedAt: "2026-10-20T12:00:00.000Z",
        } satisfies TelemetryRecord;
      }
      return {
        id: "t-norm",
        containerId: "c-norm",
        fillLevelPercent: 30,
        batteryLevelPercent: 95,
        temperatureCelsius: 20,
        recordedAt: "2026-10-20T12:00:00.000Z",
      } satisfies TelemetryRecord;
    });

    render(<IoTFleetDiagnosticCard />);

    const auditBtn = screen.getByRole("button", { name: "Auditar flota IoT" });
    fireEvent.click(auditBtn);

    const dispatchList = await screen.findByTestId("diagnostic-dispatch-list");
    expect(dispatchList).toBeDefined();

    // Verificación de la presencia de ambos contenedores urgentes
    expect(screen.getByText("CTR-CRITICO")).toBeDefined();
    expect(screen.getByText("96%")).toBeDefined();
    expect(screen.getByText("Inmediata")).toBeDefined();

    expect(screen.getByText("CTR-ALERTA")).toBeDefined();
    expect(screen.getByText("82%")).toBeDefined();
    expect(screen.getByText("Programada")).toBeDefined();

    // Contador de batería baja detecta 1
    const lowBattery = screen.getByTestId("diagnostic-low-battery");
    expect(lowBattery.textContent).toBe("1");

    // Severidad crítica reflejada
    const severityBadge = screen.getByTestId("diagnostic-severity-badge");
    expect(severityBadge.textContent).toContain("Crítico");
  });

  test("d) Valida manejo resiliente cuando no hay contenedores o la flota está vacía", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [],
    });

    render(<IoTFleetDiagnosticCard />);

    const auditBtn = screen.getByRole("button", { name: "Auditar flota IoT" });
    fireEvent.click(auditBtn);

    const totalMonitored = await screen.findByTestId("diagnostic-total-monitored");
    expect(totalMonitored.textContent).toBe("0");

    const averageFill = screen.getByTestId("diagnostic-average-fill");
    expect(averageFill.textContent).toBe("0%");

    const lowBattery = screen.getByTestId("diagnostic-low-battery");
    expect(lowBattery.textContent).toBe("0");

    const severityBadge = screen.getByTestId("diagnostic-severity-badge");
    expect(severityBadge.textContent).toContain("Sin telemetría");

    const summary = screen.getByTestId("diagnostic-executive-summary");
    expect(summary.textContent).toMatch(/No hay contenedores con telemetría activa/i);

    // No debe renderizar lista de despacho urgente
    expect(screen.queryByTestId("diagnostic-dispatch-list")).toBeNull();
  });
});

