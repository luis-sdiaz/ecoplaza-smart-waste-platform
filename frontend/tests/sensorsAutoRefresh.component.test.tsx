import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SensorsPage from "../src/pages/SensorsPage";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
  getTelemetryHistory: vi.fn(),
  currentUser: { id: "user-live-1", email: "operaciones@ecoplaza.com" },
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
  getTelemetryHistory: mocks.getTelemetryHistory,
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

const mockContainer = {
  id: "ctr-live-uuid",
  code: "CTR-LIVE-01",
  createdAt: "2026-10-18T10:00:00.000Z",
};

const mockTelemetry: TelemetryRecord = {
  id: "tel-live-1",
  containerId: "ctr-live-uuid",
  fillLevelPercent: 55,
  batteryLevelPercent: 90,
  temperatureCelsius: 22.0,
  recordedAt: "2026-10-20T19:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  mocks.listContainers.mockReset();
  mocks.getLatestTelemetry.mockReset();
  mocks.getTelemetryHistory.mockReset();

  mocks.listContainers.mockResolvedValue({
    ok: true,
    data: [mockContainer],
  });
  mocks.getLatestTelemetry.mockResolvedValue(mockTelemetry);
  mocks.getTelemetryHistory.mockResolvedValue([mockTelemetry]);
});

describe("SensorsPage Live Auto-Refresh periodic telemetry", () => {
  test("auto-refresh toggle is disabled by default and reflects paused state", async () => {
    render(<SensorsPage />);

    expect(await screen.findByText("CTR-LIVE-01")).toBeTruthy();

    const toggle = screen.getByRole("switch", { name: "sensors.autoRefreshAriaLabel" });
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("sensors.paused")).toBeTruthy();
  });

  test("activates auto-refresh on toggle click and triggers periodic refresh every 10s", async () => {
    vi.useFakeTimers();

    render(<SensorsPage />);

    // Resuelve la primera carga
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(screen.getByText("CTR-LIVE-01")).toBeTruthy();
    const initialCalls = mocks.getLatestTelemetry.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    const toggle = screen.getByRole("switch", { name: "sensors.autoRefreshAriaLabel" });

    // Activar toggle
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("sensors.live")).toBeTruthy();

    // Avanzar 10 segundos
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(initialCalls + 1);

    // Avanzar otros 10 segundos
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(initialCalls + 2);
  });

  test("cleans up timer on toggle deactivation and component unmount without orphaned executions", async () => {
    vi.useFakeTimers();

    const { unmount } = render(<SensorsPage initialAutoRefresh={true} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const toggle = screen.getByRole("switch", { name: "sensors.autoRefreshAriaLabel" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    // Desactivar toggle
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("sensors.paused")).toBeTruthy();

    const callsAfterPause = mocks.getLatestTelemetry.mock.calls.length;

    // Avanzar 20 segundos: no deben ocurrir nuevas llamadas
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(callsAfterPause);

    // Desmontar el componente
    unmount();

    // Avanzar otros 30 segundos
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(callsAfterPause);
  });

  test("pauses periodic auto-refresh while history modal is open", async () => {
    vi.useFakeTimers();

    render(<SensorsPage initialAutoRefresh={true} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(screen.getByText("CTR-LIVE-01")).toBeTruthy();

    // Abrir modal de historial
    const historyBtn = screen.getByRole("button", { name: "sensors.viewHistoryFor:CTR-LIVE-01" });
    await act(async () => {
      fireEvent.click(historyBtn);
    });

    expect(screen.getByRole("dialog")).toBeTruthy();

    const callsDuringModal = mocks.getLatestTelemetry.mock.calls.length;

    // Avanzar 20 segundos con el modal abierto: el auto-refresco debe estar en pausa
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(callsDuringModal);
  });
});

