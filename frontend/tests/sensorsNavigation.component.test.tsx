import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import SensorDeviceCard from "../src/components/SensorDeviceCard";
import SensorsPage from "../src/pages/SensorsPage";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
  currentUser: { id: "user-nav-1", email: "operaciones@ecoplaza.com" },
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
  id: "ctr-uuid-nav-77",
  code: "CTR-PLAZA-CENTRAL",
  createdAt: "2026-10-18T10:00:00.000Z",
};

const mockTelemetry: TelemetryRecord = {
  id: "tel-nav-1",
  containerId: "ctr-uuid-nav-77",
  fillLevelPercent: 60,
  batteryLevelPercent: 95,
  temperatureCelsius: 21.5,
  recordedAt: "2026-10-20T19:00:00.000Z",
};

function LocationObserver() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.listContainers.mockReset();
  mocks.getLatestTelemetry.mockReset();

  mocks.listContainers.mockResolvedValue({
    ok: true,
    data: [mockContainer],
  });
  mocks.getLatestTelemetry.mockResolvedValue(mockTelemetry);
});

describe("Direct operational link from IoT SensorDeviceCard and SensorsPage navigation", () => {
  test("renders accessible manage button with semantic label and ARIA attributes in SensorDeviceCard", () => {
    const handleManage = vi.fn();

    render(
      <SensorDeviceCard
        name="CTR-PLAZA-CENTRAL"
        sensorId="ctr-uuid-nav-77"
        hasTelemetry={true}
        fillLevel={60}
        onManageContainer={handleManage}
      />,
    );

    const manageBtn = screen.getByRole("button", {
      name: "sensors.manageContainerAriaLabel:CTR-PLAZA-CENTRAL",
    });
    expect(manageBtn).toBeTruthy();
    expect(screen.getByText("sensors.manageContainer")).toBeTruthy();

    fireEvent.click(manageBtn);
    expect(handleManage).toHaveBeenCalledTimes(1);
    expect(handleManage).toHaveBeenCalledWith("ctr-uuid-nav-77");
  });

  test("does not render manage button when onManageContainer prop is omitted", () => {
    render(
      <SensorDeviceCard
        name="CTR-PLAZA-CENTRAL"
        sensorId="ctr-uuid-nav-77"
        hasTelemetry={true}
        fillLevel={60}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "sensors.manageContainerAriaLabel:CTR-PLAZA-CENTRAL",
      }),
    ).toBeNull();
  });

  test("triggers onNavigateToContainers callback in SensorsPage when clicking manage", async () => {
    const onNavigate = vi.fn();

    render(<SensorsPage onNavigateToContainers={onNavigate} />);

    expect(await screen.findByText("CTR-PLAZA-CENTRAL")).toBeTruthy();

    const manageBtn = screen.getByRole("button", {
      name: "sensors.manageContainerAriaLabel:CTR-PLAZA-CENTRAL",
    });
    fireEvent.click(manageBtn);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("ctr-uuid-nav-77");
  });

  test("navigates to /containers via react-router-dom in integrated SensorsPage", async () => {
    render(
      <MemoryRouter initialEntries={["/sensors"]}>
        <SensorsPage />
        <LocationObserver />
      </MemoryRouter>,
    );

    expect(await screen.findByText("CTR-PLAZA-CENTRAL")).toBeTruthy();
    expect(screen.getByTestId("current-location").textContent).toBe("/sensors");

    const manageBtn = screen.getByRole("button", {
      name: "sensors.manageContainerAriaLabel:CTR-PLAZA-CENTRAL",
    });
    fireEvent.click(manageBtn);

    expect(screen.getByTestId("current-location").textContent).toBe("/containers");
  });
});

