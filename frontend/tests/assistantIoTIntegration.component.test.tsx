import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import AssistantPanel from "../src/components/AssistantPanel";
import type { Container } from "../src/services/containerService";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
}));

vi.mock("../src/services/sensorService", () => ({
  getLatestTelemetry: mocks.getLatestTelemetry,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "assistant.panelTitle": "EcoPlaza IA",
        "assistant.panelDescription":
          "Módulo de asistencia para análisis de residuos y telemetría",
        "assistant.onlineLabel": "En línea",
        "assistant.greeting":
          "¡Hola! Soy el asistente inteligente de EcoPlaza. ¿En qué puedo ayudarte hoy?",
        "assistant.goToSensorsAction": "Ver consola de sensores IoT",
        "assistant.inputPlaceholder":
          "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
        "assistant.sendButtonLabel": "Enviar mensaje",
        "assistant.typingIndicator": "EcoPlaza IA está escribiendo...",
      };
      return dict[key] ?? key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockContainers: Container[] = [
  {
    id: "ctr-iot-01",
    code: "CTR-PLAZA-CENTRAL",
    createdAt: "2026-10-18T10:00:00.000Z",
  },
  {
    id: "ctr-iot-02",
    code: "CTR-PLAZA-SUR",
    createdAt: "2026-10-18T11:00:00.000Z",
  },
];

const mockTelemetry1: TelemetryRecord = {
  id: "tel-01",
  containerId: "ctr-iot-01",
  fillLevelPercent: 93,
  batteryLevelPercent: 14,
  temperatureCelsius: 22.4,
  recordedAt: "2026-10-21T18:00:00.000Z",
};

const mockTelemetry2: TelemetryRecord = {
  id: "tel-02",
  containerId: "ctr-iot-02",
  fillLevelPercent: 45,
  batteryLevelPercent: 88,
  temperatureCelsius: 19.8,
  recordedAt: "2026-10-21T18:02:00.000Z",
};

function LocationObserver() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

describe("Integración Reactiva de Telemetría IoT en Panel del Asistente (Tarea 078)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mocks.listContainers.mockResolvedValue({
      ok: true,
      data: mockContainers,
    });
    mocks.getLatestTelemetry.mockImplementation(async (id: string) => {
      if (id === "ctr-iot-01") return mockTelemetry1;
      if (id === "ctr-iot-02") return mockTelemetry2;
      return null;
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
    cleanup();
  });

  test("a) Validar que AssistantPanel obtiene la telemetría viva y la transmite a la lógica del asistente al consultar por 'sensores' o 'batería'", async () => {
    render(
      <MemoryRouter initialEntries={["/assistant"]}>
        <AssistantPanel />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    // Consultar por estado de baterías
    fireEvent.change(input, {
      target: { value: "¿Cuál es el estado de la batería de los sensores?" },
    });
    fireEvent.click(sendButton);

    // Debe mostrar la respuesta generada con heurística de batería
    expect(
      await screen.findByText(/Estado de Baterías de Sensores IoT/i),
    ).toBeDefined();
    expect(await screen.findByText(/14% de batería/i)).toBeDefined();
    expect(await screen.findByText(/CTR-PLAZA-CENTRAL/i)).toBeDefined();

    // Validar que se invocaron los servicios de contenedores y telemetría en vivo
    expect(mocks.listContainers).toHaveBeenCalledTimes(1);
    expect(mocks.getLatestTelemetry).toHaveBeenCalledWith("ctr-iot-01");
    expect(mocks.getLatestTelemetry).toHaveBeenCalledWith("ctr-iot-02");
  });

  test("b) Validar renderizado accesible de la acción rápida hacia /sensors cuando se genera una respuesta de diagnóstico IoT", async () => {
    render(
      <MemoryRouter initialEntries={["/assistant"]}>
        <AssistantPanel />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    // Consultar por telemetría general
    fireEvent.change(input, {
      target: { value: "diagnóstico de sensores de la flota" },
    });
    fireEvent.click(sendButton);

    // Esperar respuesta de diagnóstico
    expect(
      await screen.findByText(/Diagnóstico General de Flota y Sensores IoT/i),
    ).toBeDefined();

    // Validar enlace accesible hacia la consola de sensores
    const actionLink = screen.getByRole("link", {
      name: "Ver consola de sensores IoT",
    });
    expect(actionLink).toBeDefined();
    expect(actionLink.getAttribute("aria-label")).toBe(
      "Ver consola de sensores IoT",
    );
    expect(actionLink.getAttribute("href")).toBe("/sensors");
  });

  test("c) Validar navegación al hacer clic en dicha acción rápida hacia la ruta /sensors", async () => {
    render(
      <MemoryRouter initialEntries={["/assistant"]}>
        <AssistantPanel />
        <LocationObserver />
      </MemoryRouter>,
    );

    // Estado inicial de la ruta
    expect(screen.getByTestId("current-location").textContent).toBe("/assistant");

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "¿qué contenedores requieren recolección urgente?" },
    });
    fireEvent.click(sendButton);

    // Esperar respuesta de recolección urgente
    expect(
      await screen.findByText(/Despacho y Recolección Urgente IoT/i),
    ).toBeDefined();

    const actionLink = screen.getByRole("link", {
      name: "Ver consola de sensores IoT",
    });
    fireEvent.click(actionLink);

    // La ruta debe cambiar a /sensors
    expect(screen.getByTestId("current-location").textContent).toBe("/sensors");
  });

  test("d) Soporte de callback onNavigateToSensors y omisión de acción en consultas no IoT", async () => {
    const handleNavigate = vi.fn();

    render(
      <MemoryRouter initialEntries={["/assistant"]}>
        <AssistantPanel onNavigateToSensors={handleNavigate} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    // Consulta IoT con callback personalizado
    fireEvent.change(input, { target: { value: "estado de sensores" } });
    fireEvent.click(sendButton);

    const actionLink = await screen.findByRole("link", {
      name: "Ver consola de sensores IoT",
    });
    fireEvent.click(actionLink);
    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });
});
