import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Container } from "../src/services/containerService";
import type { SensorTelemetry } from "../src/services/telemetryService";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
  }
}

expect.extend({
  toBeInTheDocument(received: Element | null) {
    const pass = received !== null && document.body.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? "Expected element not to be in document"
          : "Expected element to be in document",
    };
  },
});

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  listAvailableWasteRecords: vi.fn(),
  createContainer: vi.fn(),
  saveContainerCsv: vi.fn(),
  saveContainerExcel: vi.fn(),
  fetchLatestTelemetryByContainer: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      if (typeof options === "object" && options !== null && "count" in options) {
        return `${key} ${String(options.count)}`;
      }
      if (typeof options === "string") return options;
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  createContainer: mocks.createContainer,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: mocks.listAvailableWasteRecords,
}));

vi.mock("../src/services/containerCsv", () => ({
  saveContainerCsv: mocks.saveContainerCsv,
}));

vi.mock("../src/services/containerExcelService", () => ({
  saveContainerExcel: mocks.saveContainerExcel,
}));

vi.mock("../src/services/telemetryService", () => ({
  fetchLatestTelemetryByContainer: mocks.fetchLatestTelemetryByContainer,
  calculateFillStatus: (fill: number) =>
    fill >= 90 ? "critical" : fill >= 70 ? "warning" : "normal",
}));

import ContainersPage from "../src/pages/ContainersPage";

const mockDbContainers: Container[] = [
  { id: "cont-1", code: "CONT-ORG-01", createdAt: "2026-10-01T12:00:00.000Z" },
  { id: "cont-2", code: "CONT-REC-01", createdAt: "2026-10-02T12:00:00.000Z" },
];

const mockTelemetry: SensorTelemetry = {
  id: "telem-uuid-1",
  containerId: "CTR-BOG-001",
  distanceCm: 24.5,
  fillPercentage: 75,
  recordedAt: "2026-11-04T20:00:00.000Z",
  status: "warning",
};

describe("ContainersPage & ContainerManagementPanel - Telemetría IoT en Vivo (CTR-BOG-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listContainers.mockResolvedValue({ ok: true, data: mockDbContainers });
    mocks.listAvailableWasteRecords.mockResolvedValue({ ok: true, data: [] });
    mocks.fetchLatestTelemetryByContainer.mockResolvedValue(mockTelemetry);
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renderiza la tarjeta destacada de telemetría IoT física cuando hay lecturas activas", async () => {
    render(<ContainersPage pollIntervalMs={0} />);

    const liveRegion = await screen.findByRole("region", {
      name: /Telemetría en vivo del contenedor físico CTR-BOG-001/i,
    });
    expect(liveRegion).toBeInTheDocument();

    expect(screen.getAllByText("CTR-BOG-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("IoT Live").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Warning").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("75%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("24.5 cm").length).toBeGreaterThanOrEqual(1);
  });

  it("2. Inyecta dinámicamente CTR-BOG-001 en la cuadrícula de contenedores preservando los de la base de datos", async () => {
    render(<ContainersPage pollIntervalMs={0} />);

    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();
    expect(screen.getByText("CONT-REC-01")).toBeInTheDocument();

    expect(screen.getByText("iot-ctr-bog-001")).toBeInTheDocument();
  });

  it("3. Unifica la información si CTR-BOG-001 ya existe en la base de datos sin duplicar tarjetas", async () => {
    const containersWithPhysical: Container[] = [
      { id: "cont-real-bog", code: "CTR-BOG-001", createdAt: "2026-10-01T12:00:00.000Z" },
      { id: "cont-2", code: "CONT-REC-01", createdAt: "2026-10-02T12:00:00.000Z" },
    ];
    mocks.listContainers.mockResolvedValue({ ok: true, data: containersWithPhysical });

    render(<ContainersPage pollIntervalMs={0} />);

    expect(await screen.findByText("CONT-REC-01")).toBeInTheDocument();

    expect(screen.getByText("cont-real-bog")).toBeInTheDocument();
    expect(screen.queryByText("iot-ctr-bog-001")).toBeNull();
  });

  it("4. No renderiza tarjeta destacada ni inyecta contenedor físico cuando no hay telemetría (null)", async () => {
    mocks.fetchLatestTelemetryByContainer.mockResolvedValue(null);

    render(<ContainersPage pollIntervalMs={0} />);

    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();
    expect(screen.getByText("CONT-REC-01")).toBeInTheDocument();

    expect(
      screen.queryByRole("region", {
        name: /Telemetría en vivo del contenedor físico/i,
      }),
    ).toBeNull();
    expect(screen.queryByText("iot-ctr-bog-001")).toBeNull();
  });

  it("5. Mantiene la funcionalidad de búsqueda filtrando contenedores y preservando CTR-BOG-001", async () => {
    render(<ContainersPage pollIntervalMs={0} />);

    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();
    expect(screen.getByText("iot-ctr-bog-001")).toBeInTheDocument();

    const searchInput = screen.getByLabelText("containers.searchLabel");
    fireEvent.change(searchInput, { target: { value: "BOG" } });

    expect(screen.getByText("iot-ctr-bog-001")).toBeInTheDocument();
    expect(screen.queryByText("CONT-ORG-01")).toBeNull();
    expect(screen.queryByText("CONT-REC-01")).toBeNull();
  });
});

