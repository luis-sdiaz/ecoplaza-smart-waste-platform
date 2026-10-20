import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SensorsPage from "../src/pages/SensorsPage";
import SensorDeviceCard from "../src/components/SensorDeviceCard";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
  listAvailableWasteRecords: vi.fn(),
  currentUser: { id: "user-123", email: "operador@ecoplaza.com" } as { id: string; email: string } | null,
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({ user: mocks.currentUser }),
}));

vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => ({ showDemoData: false }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  createContainer: vi.fn(),
}));

vi.mock("../src/services/sensorService", () => ({
  getLatestTelemetry: mocks.getLatestTelemetry,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: mocks.listAvailableWasteRecords,
}));

vi.mock("../src/components/ContainerManagementPanel", () => ({
  default: () => <div data-testid="container-management-panel">MockedPanel</div>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.count !== undefined) return `${key}:${options.count}`;
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockContainerA = {
  id: "ctr-uuid-alpha",
  code: "CTR-ALPHA",
  createdAt: "2026-10-15T10:00:00.000Z",
};

const mockContainerB = {
  id: "ctr-uuid-critical",
  code: "CTR-CRITICAL",
  createdAt: "2026-10-16T11:00:00.000Z",
};

const mockContainerEmpty = {
  id: "ctr-uuid-empty",
  code: "CTR-NEWBIE",
  createdAt: "2026-10-20T08:00:00.000Z",
};

const telemetryAlpha: TelemetryRecord = {
  id: "tel-001",
  containerId: "ctr-uuid-alpha",
  fillLevelPercent: 65,
  batteryLevelPercent: 92,
  temperatureCelsius: 21.8,
  recordedAt: "2026-10-20T14:00:00.000Z",
};

const telemetryCritical: TelemetryRecord = {
  id: "tel-002",
  containerId: "ctr-uuid-critical",
  fillLevelPercent: 88,
  batteryLevelPercent: 18,
  temperatureCelsius: 26.4,
  recordedAt: "2026-10-20T14:15:00.000Z",
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.currentUser = { id: "user-123", email: "operador@ecoplaza.com" };
  mocks.listContainers.mockReset();
  mocks.getLatestTelemetry.mockReset();
  mocks.listAvailableWasteRecords.mockReset();
});

describe("IoT Telemetry integration in SensorsPage and SensorDeviceCard", () => {
  test("renders complete telemetry data correctly (fill level, battery, temperature, formatted date)", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [mockContainerA],
    });
    mocks.getLatestTelemetry.mockImplementation(async (id: string) => {
      if (id === mockContainerA.id) return telemetryAlpha;
      return null;
    });

    render(<SensorsPage />);

    // Verifica que el contenedor aparece en pantalla
    expect(await screen.findByText("CTR-ALPHA")).toBeTruthy();
    expect(screen.getByText("ctr-uuid-alpha")).toBeTruthy();

    // Nivel de llenado y status
    expect(screen.getByText("65%")).toBeTruthy();
    expect(screen.getByText("common.active")).toBeTruthy();

    // Batería y temperatura
    expect(screen.getByText("92%")).toBeTruthy();
    expect(screen.getByText("21.8 °C")).toBeTruthy();

    // Telemetría con fecha válida (no muestra fallback de sin lectura)
    expect(screen.queryByText("sensors.noTelemetry")).toBeNull();
  });

  test("triggers visual critical fill alert and style when fillLevel exceeds 80%", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [mockContainerB],
    });
    mocks.getLatestTelemetry.mockResolvedValue(telemetryCritical);

    render(<SensorsPage />);

    expect(await screen.findByText("CTR-CRITICAL")).toBeTruthy();
    expect(screen.getByText("88%")).toBeTruthy();

    // Alerta visual de capacidad crítica (>80%)
    expect(screen.getByText("sensors.criticalFillAlert")).toBeTruthy();
    expect(screen.getByText("sensors.alertStatus")).toBeTruthy();

    // Nivel de batería baja
    expect(screen.getByText("18%")).toBeTruthy();
    expect(screen.getByText("26.4 °C")).toBeTruthy();
  });

  test("activates resilient fallback when a container has null telemetry without throwing or NaN", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [mockContainerEmpty],
    });
    // Simula contenedor nuevo sin lecturas registradas
    mocks.getLatestTelemetry.mockResolvedValue(null);

    render(<SensorsPage />);

    expect(await screen.findByText("CTR-NEWBIE")).toBeTruthy();

    // Fallback amigable
    expect(screen.getByText("sensors.waitingSignal")).toBeTruthy();
    expect(screen.getAllByText("sensors.noTelemetry").length).toBeGreaterThan(0);

    // Los valores deben ser guiones '—' y jamás NaN ni NaN%
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);

    // Asegurar que no hay ningún NaN en pantalla
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });

  test("activates resilient fallback if telemetry fetch rejects with network error", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [mockContainerA, mockContainerEmpty],
    });
    mocks.getLatestTelemetry.mockImplementation(async (id: string) => {
      if (id === mockContainerA.id) return telemetryAlpha;
      throw new Error("Supabase timeout on telemetry query");
    });

    render(<SensorsPage />);

    // El primer contenedor carga correctamente
    expect(await screen.findByText("CTR-ALPHA")).toBeTruthy();
    expect(screen.getByText("65%")).toBeTruthy();

    // El segundo contenedor activa fallback limpiamente sin romper la grilla
    expect(screen.getByText("CTR-NEWBIE")).toBeTruthy();
    expect(screen.getByText("sensors.waitingSignal")).toBeTruthy();
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });

  test("allows manual refresh of telemetry data when clicking refresh button", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [mockContainerA],
    });
    mocks.getLatestTelemetry.mockResolvedValue(telemetryAlpha);

    render(<SensorsPage />);

    expect(await screen.findByText("CTR-ALPHA")).toBeTruthy();
    expect(mocks.getLatestTelemetry).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByRole("button", { name: "sensors.refreshTelemetry" });
    fireEvent.click(refreshBtn);

    // Verifica que se volvió a consultar
    await vi.waitFor(() => {
      expect(mocks.getLatestTelemetry).toHaveBeenCalledTimes(2);
    });
  });

  test("renders empty state when user has no registered containers", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [],
    });

    render(<SensorsPage />);

    expect(await screen.findByText("sensors.noContainersTitle")).toBeTruthy();
    expect(screen.getByText("sensors.noContainersDescription")).toBeTruthy();
  });

  test("isolated SensorDeviceCard renders fallback correctly when hasTelemetry is false", () => {
    render(
      <SensorDeviceCard
        name="CTR-ISOLATED"
        sensorId="SEN-ISO-999"
        hasTelemetry={false}
        fillLevel={null}
        batteryLevel={null}
        temperatureCelsius={null}
      />,
    );

    expect(screen.getByText("CTR-ISOLATED")).toBeTruthy();
    expect(screen.getByText("SEN-ISO-999")).toBeTruthy();
    expect(screen.getByText("sensors.waitingSignal")).toBeTruthy();
    expect(screen.getAllByText("sensors.noTelemetry").length).toBeGreaterThan(0);
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });
});

