import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SensorTelemetryHistoryModal from "../src/components/SensorTelemetryHistoryModal";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  getTelemetryHistory: vi.fn(),
}));

vi.mock("../src/services/sensorService", () => ({
  getTelemetryHistory: mocks.getTelemetryHistory,
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

const mockRecords: TelemetryRecord[] = [
  {
    id: "telem-rec-1",
    containerId: "ctr-test-01",
    fillLevelPercent: 88, // > 80: critical alert badge, red bar
    batteryLevelPercent: 18, // <= 20: BatteryWarning (danger)
    temperatureCelsius: 25.5,
    recordedAt: "2026-10-25T10:00:00.000Z",
  },
  {
    id: "telem-rec-2",
    containerId: "ctr-test-01",
    fillLevelPercent: 45, // <= 80: normal
    batteryLevelPercent: 42, // <= 50: BatteryMedium (warning)
    temperatureCelsius: null, // null: renders "—"
    recordedAt: "2026-10-25T09:00:00.000Z",
  },
  {
    id: "telem-rec-3",
    containerId: "ctr-test-01",
    fillLevelPercent: 10,
    batteryLevelPercent: 95, // > 50: Battery (primary)
    temperatureCelsius: 19.8,
    recordedAt: "2026-10-25T08:00:00.000Z",
  },
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.getTelemetryHistory.mockReset();
});

describe("SensorTelemetryHistoryModal component", () => {
  test("renders accessible dialog with WAI-ARIA attributes, title, subtitle and custom testId when isOpen is true", async () => {
    mocks.getTelemetryHistory.mockResolvedValue([]);

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Bio-Orgánico"
        isOpen={true}
        onClose={vi.fn()}
        testId="custom-telemetry-history-modal"
      />,
    );

    const dialog = screen.getByTestId("custom-telemetry-history-modal");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("telemetry-history-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("telemetry-history-subtitle");

    expect(screen.getByRole("heading", { level: 2, name: "sensors.historyModalTitle" })).toBeTruthy();
    expect(screen.getByText("sensors.historyModalSubtitle:Contenedor Bio-Orgánico")).toBeTruthy();
  });

  test("does not render when isOpen is false", () => {
    const { container } = render(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Bio-Orgánico"
        isOpen={false}
        onClose={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.getTelemetryHistory).not.toHaveBeenCalled();
  });

  test("handles modal close interactions via close button, footer button, and Escape key", async () => {
    mocks.getTelemetryHistory.mockResolvedValue([]);
    const handleClose = vi.fn();

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Bio-Orgánico"
        isOpen={true}
        onClose={handleClose}
      />,
    );

    await screen.findByRole("dialog");

    // Close button (X icon in header with aria-label="sensors.closeHistory")
    const closeButtons = screen.getAllByRole("button", { name: "sensors.closeHistory" });
    expect(closeButtons.length).toBe(2);

    // Click header close button
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click footer close button
    fireEvent.click(closeButtons[1]);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Press Escape key on dialog
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  test("displays accessible loading state while telemetry is being fetched", () => {
    mocks.getTelemetryHistory.mockReturnValue(new Promise(() => {}));

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Bio-Orgánico"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    const statusElement = screen.getByRole("status");
    expect(statusElement).toBeTruthy();
    expect(screen.getByText("sensors.historyLoading")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("handles fetch error gracefully and allows retrying", async () => {
    mocks.getTelemetryHistory.mockRejectedValueOnce(new Error("Telemetry service unavailable"));
    mocks.getTelemetryHistory.mockResolvedValueOnce(mockRecords);

    render(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Bio-Orgánico"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Alerta accesible de error
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toBeTruthy();
    expect(screen.getByText("sensors.historyError")).toBeTruthy();

    // Botón de reintento con estados
    const retryButton = screen.getByRole("button", { name: "containers.retry" });
    expect(retryButton).toBeTruthy();
    expect(retryButton.hasAttribute("disabled")).toBe(false);

    // Click retry
    fireEvent.click(retryButton);

    // Debe cargar los datos tras el reintento exitoso
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(screen.getByText("88%")).toBeTruthy();
    expect(mocks.getTelemetryHistory).toHaveBeenCalledTimes(2);
  });

  test("renders empty state when no telemetry exists, and table with metrics, alert badge and battery indicators when telemetry is present", async () => {
    // Sub-caso A: Colección vacía
    mocks.getTelemetryHistory.mockResolvedValueOnce([]);

    const { rerender } = render(
      <SensorTelemetryHistoryModal
        containerId="ctr-empty"
        containerName="Contenedor Vacío"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("sensors.noHistory")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();

    // Sub-caso B: Con registros de telemetría variados
    mocks.getTelemetryHistory.mockResolvedValueOnce(mockRecords);

    rerender(
      <SensorTelemetryHistoryModal
        containerId="ctr-test-01"
        containerName="Contenedor Activo"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeTruthy();
    expect(table.getAttribute("aria-label")).toBe("sensors.historyModalTitle");

    // Columnas de encabezado
    expect(screen.getByRole("columnheader", { name: "sensors.historyColDate" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "sensors.historyColFill" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "sensors.historyColBattery" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "sensors.historyColTemperature" })).toBeTruthy();

    // Valores de llenado
    expect(screen.getByText("88%")).toBeTruthy();
    expect(screen.getByText("45%")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();

    // Badge de alerta crítica para llenado > 80%
    expect(screen.getByText("sensors.alertStatus")).toBeTruthy();

    // Valores de batería
    expect(screen.getByText("18%")).toBeTruthy();
    expect(screen.getByText("42%")).toBeTruthy();
    expect(screen.getByText("95%")).toBeTruthy();

    // Valores de temperatura (incluyendo null -> "—")
    expect(screen.getByText("25.5 °C")).toBeTruthy();
    expect(screen.getByText("19.8 °C")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });
});

