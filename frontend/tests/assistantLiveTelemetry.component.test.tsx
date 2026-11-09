import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AssistantPage from "../src/pages/AssistantPage";
import AssistantPanel from "../src/components/AssistantPanel";
import type { SensorTelemetry } from "../src/services/telemetryService";
import { geminiAiService } from "../src/services/geminiAiService.ts";

const telemetryMocks = vi.hoisted(() => ({
  fetchLatestTelemetryByContainer: vi.fn(),
  listContainers: vi.fn(),
  getLatestTelemetry: vi.fn(),
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
        "assistant.inputPlaceholder":
          "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
        "assistant.sendButtonLabel": "Enviar mensaje",
        "assistant.typingIndicator": "EcoPlaza IA está escribiendo...",
      };
      return dict[key] ?? key;
    },
    i18n: { language: "es", resolvedLanguage: "es" },
  }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: telemetryMocks.listContainers,
}));

vi.mock("../src/services/sensorService", () => ({
  getLatestTelemetry: telemetryMocks.getLatestTelemetry,
}));

vi.mock("../src/services/telemetryService", () => ({
  fetchLatestTelemetryByContainer:
    telemetryMocks.fetchLatestTelemetryByContainer,
  calculateFillStatus: (fill: number) =>
    fill >= 90 ? "critical" : fill >= 70 ? "warning" : "normal",
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../src/services/salesService", () => ({
  listSales: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

const mockActiveTelemetry: SensorTelemetry = {
  id: "telem-uuid-1",
  containerId: "CTR-BOG-001",
  distanceCm: 24.5,
  fillPercentage: 75,
  status: "warning",
  recordedAt: "2026-11-04T20:00:00.000Z",
};

describe("Assistant IoT Live Telemetry Integration (CTR-BOG-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geminiAiService.configure({ enabled: false });
    window.sessionStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    telemetryMocks.listContainers.mockResolvedValue({ ok: true, data: [] });
    telemetryMocks.getLatestTelemetry.mockResolvedValue(null);
    telemetryMocks.fetchLatestTelemetryByContainer.mockResolvedValue(
      mockActiveTelemetry,
    );
  });

  afterEach(() => {
    window.sessionStorage.clear();
    cleanup();
  });

  it("1. Responde con precisión a consultas sobre CTR-BOG-001 exhibiendo métricas, distancia y estado semántico", async () => {
    render(
      <MemoryRouter>
        <AssistantPanel physicalTelemetry={mockActiveTelemetry} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "¿Cuál es el estado del contenedor CTR-BOG-001?" },
    });
    fireEvent.click(sendButton);

    expect(
      screen.getByText("¿Cuál es el estado del contenedor CTR-BOG-001?"),
    ).toBeDefined();
    expect(
      await screen.findByText(/Estado del Sensor de Telemetría IoT en Vivo/i),
    ).toBeDefined();
    const ctrMatches = await screen.findAllByText(/CTR-BOG-001/i);
    expect(ctrMatches.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/75%/i)).toBeDefined();
    expect(await screen.findByText(/24\.5 cm/i)).toBeDefined();
    const warningMatches = await screen.findAllByText(/Warning|Advertencia/i);
    expect(warningMatches.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Hora de Colombia/i)).toBeDefined();
  });

  it("2. Reconoce consultas sobre el sensor de telemetría en vivo", async () => {
    render(
      <MemoryRouter>
        <AssistantPanel physicalTelemetry={mockActiveTelemetry} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "¿Cómo está el sensor de telemetría en vivo?" },
    });
    fireEvent.click(sendButton);

    expect(
      screen.getByText("¿Cómo está el sensor de telemetría en vivo?"),
    ).toBeDefined();
    expect(
      await screen.findByText(/Estado del Sensor de Telemetría IoT en Vivo/i),
    ).toBeDefined();
    expect(await screen.findByText(/24\.5 cm/i)).toBeDefined();
  });

  it("3. Identifica contenedores en nivel crítico cuando CTR-BOG-001 supera el 90%", async () => {
    const criticalTelemetry: SensorTelemetry = {
      ...mockActiveTelemetry,
      fillPercentage: 94.2,
      distanceCm: 8.5,
      status: "critical",
    };

    render(
      <MemoryRouter>
        <AssistantPanel physicalTelemetry={criticalTelemetry} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "¿Hay algún contenedor en nivel crítico?" },
    });
    fireEvent.click(sendButton);

    expect(
      screen.getByText("¿Hay algún contenedor en nivel crítico?"),
    ).toBeDefined();
    expect(
      await screen.findByText(/Despacho y Recolección Urgente IoT/i),
    ).toBeDefined();
    expect(await screen.findByText(/CTR-BOG-001: 94\.2% de llenado/i)).toBeDefined();
    expect(await screen.findByText(/Inmediata/i)).toBeDefined();
  });

  it("4. Indica de forma clara y resiliente que el hardware está en espera de señal cuando no hay telemetría activa (null)", async () => {
    render(
      <MemoryRouter>
        <AssistantPanel physicalTelemetry={null} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "¿Cuál es el estado del contenedor CTR-BOG-001?" },
    });
    fireEvent.click(sendButton);

    expect(
      screen.getByText("¿Cuál es el estado del contenedor CTR-BOG-001?"),
    ).toBeDefined();
    expect(
      await screen.findByText(/Estado del Sensor Físico \(CTR-BOG-001\)/i),
    ).toBeDefined();
    const waitingMatches = await screen.findAllByText(/En espera de señal/i);
    expect(waitingMatches.length).toBeGreaterThanOrEqual(1);
  });

  it("5. AssistantPage carga e inyecta la telemetría viva al panel del asistente", async () => {
    render(
      <MemoryRouter>
        <AssistantPage initialTelemetry={mockActiveTelemetry} />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, {
      target: { value: "estado de CTR-BOG-001" },
    });
    fireEvent.click(sendButton);

    expect(
      screen.getByText("estado de CTR-BOG-001"),
    ).toBeDefined();

    const ctrMatches = await screen.findAllByText(/CTR-BOG-001/i);
    expect(ctrMatches.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/75%/i)).toBeDefined();
  });

  it("6. Prioriza el motor Gemini AI para telemetría de CTR-BOG-001 cuando la API está disponible", async () => {
    geminiAiService.configure({ enabled: true });
    const originalGenerate = geminiAiService.generateText;
    geminiAiService.generateText = async () =>
      "📡 Análisis Gemini AI: El contenedor físico CTR-BOG-001 tiene un nivel de 75% y distancia ultrasónica de 24.5 cm.";

    try {
      render(
        <MemoryRouter>
          <AssistantPanel physicalTelemetry={mockActiveTelemetry} />
        </MemoryRouter>,
      );

      const input = screen.getByRole("textbox");
      const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

      fireEvent.change(input, {
        target: { value: "¿Cuál es el estado del contenedor CTR-BOG-001?" },
      });
      fireEvent.click(sendButton);

      expect(
        await screen.findByText("Gemini AI", {}, { timeout: 4000 }),
      ).toBeDefined();
      expect(
        await screen.findByText(
          /Análisis Gemini AI: El contenedor físico CTR-BOG-001/,
          {},
          { timeout: 4000 },
        ),
      ).toBeDefined();
    } finally {
      geminiAiService.generateText = originalGenerate;
      geminiAiService.configure({ enabled: false });
    }
  });
});
