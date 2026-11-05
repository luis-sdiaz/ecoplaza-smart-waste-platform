import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LiveTelemetryCard from "../src/components/LiveTelemetryCard";
import type { SensorTelemetry } from "../src/services/telemetryService";

const translations: Record<string, string> = {
  "sensors.liveTelemetryTitle": "Telemetría IoT en Vivo",
  "sensors.liveTelemetrySubtitle": "Monitoreo en tiempo real del sensor ultrasónico HC-SR04",
  "sensors.onlineStatus": "En línea",
  "sensors.waitingForSensor": "Esperando hardware",
  "sensors.fillLevel": "Nivel de llenado",
  "sensors.ultrasonicDistance": "Distancia ultrasónica",
  "sensors.lastReading": "Última lectura",
  "sensors.refreshTelemetry": "Actualizar telemetría",
  "sensors.noTelemetryYet": "Aún no hay telemetría registrada",
  "sensors.loadingTelemetry": "Cargando telemetría de sensores...",
  "containers.retry": "Reintentar",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockFetchLatestTelemetryByContainer = vi.fn();

vi.mock("../src/services/telemetryService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/services/telemetryService")>();
  return {
    ...actual,
    fetchLatestTelemetryByContainer: (containerId: string) =>
      mockFetchLatestTelemetryByContainer(containerId),
  };
});

describe("LiveTelemetryCard Component (Tarea 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("1. Renderiza el estado inicial de carga mientras consulta telemetría", () => {
    // Promesa pendiente para congelar el estado de carga
    mockFetchLatestTelemetryByContainer.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<LiveTelemetryCard containerId="CTR-BOG-001" />);

    expect(screen.getByRole("status")).toBeTruthy();
    expect(
      screen.getByText("Cargando telemetría de sensores..."),
    ).toBeTruthy();
  });

  test("2. Renderiza exitosamente la telemetría en vivo (nivel %, distancia en cm y badge en línea)", async () => {
    const mockTelemetry: SensorTelemetry = {
      id: "telem-uuid-001",
      containerId: "CTR-BOG-001",
      distanceCm: 18.5,
      fillPercentage: 81.5,
      recordedAt: "2026-11-04T16:30:00.000Z",
      status: "warning",
    };

    mockFetchLatestTelemetryByContainer.mockResolvedValueOnce(mockTelemetry);

    render(
      <LiveTelemetryCard
        containerId="CTR-BOG-001"
        containerName="Contenedor Central"
      />,
    );

    // Badge En línea
    expect(await screen.findByText("En línea")).toBeTruthy();
    const statusBadge = screen.getByTestId("live-telemetry-status-badge");
    expect(statusBadge.textContent).toContain("En línea");

    // Nombre y métricas
    expect(screen.getByText("Contenedor Central")).toBeTruthy();
    expect(screen.getByText("81.5%")).toBeTruthy();
    expect(screen.getByText("18.5")).toBeTruthy();

    // Barra de progreso accesible
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("81.5");
    expect(progressBar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("100");
  });

  test("notifica cada lectura activa al agregador de la página", async () => {
    const onTelemetryChange = vi.fn();
    const mockTelemetry: SensorTelemetry = {
      id: "telem-reactive-001",
      containerId: "CTR-BOG-001",
      distanceCm: 20,
      fillPercentage: 78.8,
      recordedAt: "2026-11-05T12:00:00.000Z",
      status: "warning",
    };
    mockFetchLatestTelemetryByContainer.mockResolvedValueOnce(mockTelemetry);

    render(<LiveTelemetryCard onTelemetryChange={onTelemetryChange} />);

    expect(await screen.findByText("78.8%")).toBeTruthy();
    expect(onTelemetryChange).toHaveBeenCalledWith(mockTelemetry);
  });

  test("3. Maneja estado vacío cuando el sensor aún no ha emitido lecturas ('Esperando hardware')", async () => {
    mockFetchLatestTelemetryByContainer.mockResolvedValueOnce(null);

    render(
      <LiveTelemetryCard
        containerId="CTR-BOG-002"
        containerName="Contenedor Norte"
      />,
    );

    expect(await screen.findByText("Esperando hardware")).toBeTruthy();
    expect(
      screen.getByText("Aún no hay telemetría registrada"),
    ).toBeTruthy();
    expect(screen.getByText(/Esperando hardware \(Contenedor Norte\)/)).toBeTruthy();
  });

  test("4. Dispara recarga manual al hacer clic en el botón de actualización", async () => {
    const mockTelemetry: SensorTelemetry = {
      id: "telem-uuid-002",
      containerId: "CTR-BOG-001",
      distanceCm: 45.0,
      fillPercentage: 55.0,
      recordedAt: "2026-11-04T16:35:00.000Z",
      status: "normal",
    };

    mockFetchLatestTelemetryByContainer.mockResolvedValue(mockTelemetry);

    render(<LiveTelemetryCard containerId="CTR-BOG-001" />);

    expect(await screen.findByText("55%")).toBeTruthy();
    expect(mockFetchLatestTelemetryByContainer).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByRole("button", {
      name: /Actualizar telemetría/i,
    });
    fireEvent.click(refreshButton);

    expect(mockFetchLatestTelemetryByContainer).toHaveBeenCalledTimes(2);
    expect(mockFetchLatestTelemetryByContainer).toHaveBeenCalledWith(
      "CTR-BOG-001",
    );
  });
});
