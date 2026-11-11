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
  distanceCm: 40,
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
  test("keeps the auto-refresh control hidden in the page header", async () => {
    render(<SensorsPage />);

    expect(await screen.findByText("CTR-LIVE-01")).toBeTruthy();

    expect(screen.queryByRole("switch", {
      name: "sensors.autoRefreshAriaLabel",
    })).toBeNull();
    expect(screen.queryByText("sensors.paused")).toBeNull();
    expect(screen.queryByText("sensors.autoRefresh")).toBeNull();
  });

  test("retains internal auto-refresh when enabled by configuration", async () => {
    vi.useFakeTimers();

    render(<SensorsPage initialAutoRefresh={true} />);

    // Resuelve la primera carga
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(screen.getByText("CTR-LIVE-01")).toBeTruthy();
    const initialCalls = mocks.getLatestTelemetry.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    expect(screen.queryByRole("switch", {
      name: "sensors.autoRefreshAriaLabel",
    })).toBeNull();

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

  test("cleans up the internal timer on unmount without orphaned executions", async () => {
    vi.useFakeTimers();

    const { unmount } = render(<SensorsPage initialAutoRefresh={true} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const callsBeforeUnmount = mocks.getLatestTelemetry.mock.calls.length;
    unmount();

    // Avanzar otros 30 segundos
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mocks.getLatestTelemetry.mock.calls.length).toBe(callsBeforeUnmount);
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

