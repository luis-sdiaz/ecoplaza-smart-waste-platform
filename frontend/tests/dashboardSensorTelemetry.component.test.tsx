import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ReportStatistics } from "../src/services/reportService";
import type { SensorTelemetry } from "../src/services/telemetryService";

const authState = vi.hoisted(() => ({
  current: { user: { id: "user-123", email: "test@ecoplaza.com" } },
}));

const reportMocks = vi.hoisted(() => ({
  getReportStatistics: vi.fn(),
}));

const telemetryMocks = vi.hoisted(() => ({
  fetchLatestTelemetryByContainer: vi.fn(),
  isFresh: true,
}));

const demoVisibility = vi.hoisted(() => ({
  showDemoData: true,
}));

const mockStats: ReportStatistics = {
  wasteRecordCount: 2,
  totalRegisteredWeightKg: 10,
  availableWeightKg: 5,
  soldWeightKg: 5,
  salesCount: 1,
  grossSalesValue: 500,
  distribution: [
    { category: "organic", weightKg: 5, percentage: 50 },
    { category: "recyclable", weightKg: 5, percentage: 50 },
    { category: "nonRecyclable", weightKg: 0, percentage: 0 },
  ],
  salesByCategory: [],
  salesTrend: [],
  monthlySales: [],
  topBuyers: [],
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "dashboard.monitoredSensors") return "Sensores monitoreados";
      if (key === "dashboard.monitoredSensorsDescription") {
        return `${options?.demoCount} demostrativos · ${options?.physicalCount} físico en línea`;
      }
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => demoVisibility,
}));

vi.mock("../src/services/reportService", () => ({
  getReportStatistics: reportMocks.getReportStatistics,
}));

vi.mock("../src/services/salesService", () => ({
  listSales: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../src/services/telemetryService", () => ({
  fetchLatestTelemetryByContainer: telemetryMocks.fetchLatestTelemetryByContainer,
  isTelemetryFresh: () => telemetryMocks.isFresh,
}));

import DashboardPage from "../src/pages/DashboardPage";

describe("DashboardPage IoT Telemetry Integration (CTR-BOG-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoVisibility.showDemoData = true;
    telemetryMocks.isFresh = true;
    reportMocks.getReportStatistics.mockResolvedValue({ ok: true, data: mockStats });
  });

  afterEach(() => {
    cleanup();
  });

  test("incorpora reactivamente la lectura de CTR-BOG-001 con estado Warning y mantiene contenedores base", async () => {
    const mockTelemetry: SensorTelemetry = {
      id: "telem-uuid-1",
      containerId: "CTR-BOG-001",
      distanceCm: 25.0,
      fillPercentage: 75.5,
      recordedAt: new Date().toISOString(),
      status: "warning",
    };

    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValueOnce(mockTelemetry);

    render(<DashboardPage />);

    // Verifica que se incorpore la tarjeta de telemetría viva de CTR-BOG-001
    expect(await screen.findByText("CTR-BOG-001")).toBeTruthy();
    expect(screen.getByText("75.5%")).toBeTruthy();
    expect(screen.getByText("Warning")).toBeTruthy();
    expect(screen.getByTestId("iot-live-badge")).toBeTruthy();

    // Verifica que los 3 contenedores base de respaldo se mantengan intactos
    expect(screen.getByText("waste.container 01")).toBeTruthy();
    expect(screen.getByText("waste.container 02")).toBeTruthy();
    expect(screen.getByText("waste.container 03")).toBeTruthy();

    const monitoredSensors = screen.getByText("Sensores monitoreados").closest("article")!;
    expect(monitoredSensors.textContent).toContain("4");
    expect(monitoredSensors.textContent).toContain("3 demostrativos · 1 físico en línea");
  });

  test("incorpora reactivamente la lectura de CTR-BOG-001 con estado Critical cuando supera el 90%", async () => {
    const mockTelemetry: SensorTelemetry = {
      id: "telem-uuid-2",
      containerId: "CTR-BOG-001",
      distanceCm: 8.0,
      fillPercentage: 92.0,
      recordedAt: new Date().toISOString(),
      status: "critical",
    };

    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValueOnce(mockTelemetry);

    render(<DashboardPage />);

    expect(await screen.findByText("CTR-BOG-001")).toBeTruthy();
    expect(screen.getByText("92%")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
  });

  test("mantiene los contenedores base cuando no hay telemetría activa (null) sin generar errores", async () => {
    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValueOnce(null);

    render(<DashboardPage />);

    expect(await screen.findByText("waste.container 01")).toBeTruthy();
    expect(screen.getByText("waste.container 02")).toBeTruthy();
    expect(screen.getByText("waste.container 03")).toBeTruthy();
    expect(screen.queryByText("CTR-BOG-001")).toBeNull();
    expect(screen.queryByTestId("iot-live-badge")).toBeNull();

    const monitoredSensors = screen.getByText("Sensores monitoreados").closest("article")!;
    expect(monitoredSensors.textContent).toContain("3");
    expect(monitoredSensors.textContent).toContain("3 demostrativos · 0 físico en línea");
  });

  test("no contabiliza como físico en línea una lectura histórica", async () => {
    telemetryMocks.isFresh = false;
    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValueOnce({
      id: "telem-stale",
      containerId: "CTR-BOG-001",
      distanceCm: 25,
      fillPercentage: 75,
      recordedAt: "2026-11-01T12:00:00.000Z",
      status: "warning",
    } satisfies SensorTelemetry);

    render(<DashboardPage />);

    const monitoredSensors = await screen.findByText("Sensores monitoreados");
    const card = monitoredSensors.closest("article")!;
    expect(card.textContent).toContain("3");
    expect(card.textContent).toContain("3 demostrativos · 0 físico en línea");
    expect(screen.queryByText("CTR-BOG-001")).toBeNull();
  });

  test("cuenta únicamente el sensor físico cuando los demostrativos están ocultos", async () => {
    demoVisibility.showDemoData = false;
    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValueOnce({
      id: "telem-physical-only",
      containerId: "CTR-BOG-001",
      distanceCm: 20,
      fillPercentage: 80,
      recordedAt: new Date().toISOString(),
      status: "warning",
    } satisfies SensorTelemetry);

    render(<DashboardPage />);

    expect(await screen.findByText("CTR-BOG-001")).toBeTruthy();
    const card = screen.getByText("Sensores monitoreados").closest("article")!;
    expect(card.textContent).toContain("1");
    expect(card.textContent).toContain("0 demostrativos · 1 físico en línea");
    expect(screen.queryByText("waste.container 01")).toBeNull();
    expect(screen.queryByText("waste.container 02")).toBeNull();
    expect(screen.queryByText("waste.container 03")).toBeNull();
  });
});

