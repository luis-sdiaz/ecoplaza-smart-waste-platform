import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SensorDeviceCard from "../src/components/SensorDeviceCard";
import SensorsPage from "../src/pages/SensorsPage";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
  recordTelemetry: vi.fn(),
  currentUser: { id: "user-sim-1", email: "operaciones@ecoplaza.com" },
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
  getTelemetryHistory: vi.fn().mockResolvedValue([]),
  recordTelemetry: mocks.recordTelemetry,
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
  id: "ctr-uuid-sim-77",
  code: "CTR-PLAZA-CENTRAL",
  createdAt: "2026-10-18T10:00:00.000Z",
};

const mockTelemetry: TelemetryRecord = {
  id: "tel-sim-1",
  containerId: "ctr-uuid-sim-77",
  fillLevelPercent: 60,
  batteryLevelPercent: 95,
  temperatureCelsius: 21.5,
  recordedAt: "2026-10-20T19:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.listContainers.mockReset();
  mocks.getLatestTelemetry.mockReset();
  mocks.recordTelemetry.mockReset();

  mocks.listContainers.mockResolvedValue({
    ok: true,
    data: [mockContainer],
  });
  mocks.getLatestTelemetry.mockResolvedValue(mockTelemetry);
});

describe("SensorDeviceCard contextual simulation and SensorsPage integration", () => {
  test("renders accessible simulation button with semantic label and ARIA attributes", () => {
    const handleSimulate = vi.fn();

    render(
      <SensorDeviceCard
        name="CTR-PLAZA-CENTRAL"
        sensorId="ctr-uuid-sim-77"
        hasTelemetry={true}
        fillLevel={60}
        onSimulateTelemetry={handleSimulate}
      />,
    );

    const simulateBtn = screen.getByRole("button", {
      name: "sensors.simulateCardAriaLabel:CTR-PLAZA-CENTRAL",
    });
    expect(simulateBtn).toBeTruthy();
    expect(screen.getByText("sensors.simulateCardAction")).toBeTruthy();
  });

  test("does not render simulation button when onSimulateTelemetry prop is omitted", () => {
    render(
      <SensorDeviceCard
        name="CTR-PLAZA-CENTRAL"
        sensorId="ctr-uuid-sim-77"
        hasTelemetry={true}
        fillLevel={60}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "sensors.simulateCardAriaLabel:CTR-PLAZA-CENTRAL",
      }),
    ).toBeNull();
  });

  test("triggers onSimulateTelemetry callback with containerId when clicked", () => {
    const handleSimulate = vi.fn();

    render(
      <SensorDeviceCard
        name="CTR-PLAZA-CENTRAL"
        sensorId="ctr-uuid-sim-77"
        hasTelemetry={true}
        fillLevel={60}
        onSimulateTelemetry={handleSimulate}
      />,
    );

    const simulateBtn = screen.getByRole("button", {
      name: "sensors.simulateCardAriaLabel:CTR-PLAZA-CENTRAL",
    });
    fireEvent.click(simulateBtn);

    expect(handleSimulate).toHaveBeenCalledTimes(1);
    expect(handleSimulate).toHaveBeenCalledWith("ctr-uuid-sim-77");
  });

  test("integrates with SensorsPage to open SimulateTelemetryModal with prefixed container", async () => {
    render(<SensorsPage />);

    expect(await screen.findByText("CTR-PLAZA-CENTRAL")).toBeTruthy();

    const cardSimulateBtn = screen.getByRole("button", {
      name: "sensors.simulateCardAriaLabel:CTR-PLAZA-CENTRAL",
    });
    fireEvent.click(cardSimulateBtn);

    // Modal should be opened
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("sensors.simulateModalTitle")).toBeTruthy();

    // Container should be prefixed
    expect(screen.getByTestId("selected-container-name").textContent).toBe("CTR-PLAZA-CENTRAL");
    expect(screen.getByTestId("selected-container-uuid").textContent).toContain("ctr-uuid-sim-77");
  });
});

