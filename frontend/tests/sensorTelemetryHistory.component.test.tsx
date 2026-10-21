import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SensorTelemetryHistoryModal from "../src/components/SensorTelemetryHistoryModal";
import SensorsPage from "../src/pages/SensorsPage";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  getTelemetryHistory: vi.fn(),
  getLatestTelemetry: vi.fn(),
  listContainers: vi.fn(),
  user: { id: "user-history-1", email: "auditor@ecoplaza.com" },
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => ({ showDemoData: false }),
}));

vi.mock("../src/services/sensorService", () => ({
  getTelemetryHistory: mocks.getTelemetryHistory,
  getLatestTelemetry: mocks.getLatestTelemetry,
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  createContainer: vi.fn(),
}));

vi.mock("../src/components/ContainerManagementPanel", () => ({
  default: () => <div data-testid="mocked-management-panel">Panel</div>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.name !== undefined) return `${key}:${options.name}`;
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockHistoryData: TelemetryRecord[] = [
  {
    id: "rec-1",
    containerId: "ctr-abc",
    fillLevelPercent: 72,
    batteryLevelPercent: 88,
    temperatureCelsius: 22.4,
    recordedAt: "2026-10-20T14:30:00.000Z",
  },
  {
    id: "rec-2",
    containerId: "ctr-abc",
    fillLevelPercent: 86,
    batteryLevelPercent: 89,
    temperatureCelsius: 23.1,
    recordedAt: "2026-10-20T13:30:00.000Z",
  },
  {
    id: "rec-3",
    containerId: "ctr-abc",
    fillLevelPercent: 40,
    batteryLevelPercent: 92,
    temperatureCelsius: null,
    recordedAt: "2026-10-20T12:30:00.000Z",
  },
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.getTelemetryHistory.mockReset();
  mocks.getLatestTelemetry.mockReset();
  mocks.listContainers.mockReset();
});

describe("SensorTelemetryHistoryModal and history integration", () => {
  test("renders telemetry history table with fill, battery, temperature and timestamps", async () => {
    mocks.getTelemetryHistory.mockResolvedValue(mockHistoryData);
    const onClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-abc"
        containerName="CTR-ORGANIC-01"
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Diálogo y encabezado
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("sensors.historyModalTitle")).toBeTruthy();
    expect(screen.getByText("sensors.historyModalSubtitle:CTR-ORGANIC-01")).toBeTruthy();

    // Columnas de la tabla
    expect(screen.getByText("sensors.historyColDate")).toBeTruthy();
    expect(screen.getByText("sensors.historyColFill")).toBeTruthy();
    expect(screen.getByText("sensors.historyColBattery")).toBeTruthy();
    expect(screen.getByText("sensors.historyColTemperature")).toBeTruthy();

    // Lecturas renderizadas
    expect(screen.getByText("72%")).toBeTruthy();
    expect(screen.getByText("86%")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();

    // Batería
    expect(screen.getByText("88%")).toBeTruthy();
    expect(screen.getByText("89%")).toBeTruthy();
    expect(screen.getByText("92%")).toBeTruthy();

    // Temperatura
    expect(screen.getByText("22.4 °C")).toBeTruthy();
    expect(screen.getByText("23.1 °C")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy(); // para registro con null
  });

  test("highlights critical fill level (> 80%) with alert badge", async () => {
    mocks.getTelemetryHistory.mockResolvedValue([mockHistoryData[1]]); // fillLevel: 86%
    const onClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-abc"
        containerName="CTR-ORGANIC-01"
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText("86%")).toBeTruthy();
    // Badge de alerta crítica en el registro de 86%
    expect(screen.getByText("sensors.alertStatus")).toBeTruthy();
  });

  test("renders empty state gracefully when container has no telemetry history", async () => {
    mocks.getTelemetryHistory.mockResolvedValue([]);
    const onClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-new"
        containerName="CTR-FRESH-01"
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText("sensors.noHistory")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });

  test("handles query failure with error alert and supports retry action", async () => {
    mocks.getTelemetryHistory.mockRejectedValueOnce(new Error("Database connection lost"));
    mocks.getTelemetryHistory.mockResolvedValueOnce(mockHistoryData);
    const onClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-abc"
        containerName="CTR-ORGANIC-01"
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Muestra alerta de error
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("sensors.historyError")).toBeTruthy();

    // Botón de reintento
    const retryBtn = screen.getByRole("button", { name: "containers.retry" });
    fireEvent.click(retryBtn);

    // Tras reintentar, carga los datos
    expect(await screen.findByText("72%")).toBeTruthy();
  });

  test("triggers onClose callback when clicking the close button and supports Escape", async () => {
    mocks.getTelemetryHistory.mockResolvedValue([]);
    const onClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-abc"
        containerName="CTR-ORGANIC-01"
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();

    const closeButtons = screen.getAllByRole("button", { name: "sensors.closeHistory" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalledTimes(1);

    // Presionar tecla Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("integrates with SensorsPage to open history modal on container card action", async () => {
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: [{ id: "ctr-card-1", code: "CTR-METRO-01", createdAt: "2026-10-18T10:00:00.000Z" }],
    });
    mocks.getLatestTelemetry.mockResolvedValue(mockHistoryData[0]);
    mocks.getTelemetryHistory.mockResolvedValue(mockHistoryData);

    render(<SensorsPage />);

    // Esperar a que la tarjeta de contenedor aparezca
    expect(await screen.findByText("CTR-METRO-01")).toBeTruthy();

    // Localizar botón de ver historial
    const historyBtn = screen.getByRole("button", { name: "sensors.viewHistoryFor:CTR-METRO-01" });
    fireEvent.click(historyBtn);

    // Verifica que el modal se abrió
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("sensors.historyModalTitle")).toBeTruthy();
    expect(screen.getByText("sensors.historyModalSubtitle:CTR-METRO-01")).toBeTruthy();
  });
});

