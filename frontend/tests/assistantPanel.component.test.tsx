import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AssistantPanel from "../src/components/AssistantPanel";
import type { RemoteWasteRecord } from "../src/services/wasteService";
import type { SaleHistoryItem } from "../src/services/salesService";
import type { Buyer } from "../src/services/buyerService";

const translations: Record<string, string> = {
  "assistant.panelTitle": "EcoPlaza IA",
  "assistant.panelDescription":
    "Módulo de asistencia para análisis de residuos y telemetría",
  "assistant.onlineLabel": "En línea",
  "assistant.greeting":
    "¡Hola! Soy el asistente inteligente de EcoPlaza. ¿En qué puedo ayudarte hoy?",
  "assistant.inputPlaceholder":
    "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
  "assistant.sendButtonLabel": "Enviar mensaje",
  "assistant.typingIndicator": "EcoPlaza IA está calculando...",
  "assistant.insights.title": "Diagnósticos estratégicos",
  "assistant.insights.valuationChip": "Valorizar inventario",
  "assistant.insights.agingChip": "Riesgo de merma",
  "assistant.insights.buyersChip": "Compradores sugeridos",
  "assistant.insights.close": "Cerrar diagnóstico",
  "assistant.insights.valuationTitle": "Valorización Económica de Stock",
  "assistant.insights.valuationSubtitle":
    "Estimación de ingresos potenciales con precios promedio históricos",
  "assistant.insights.totalEstimatedValue": "Valor total estimado",
  "assistant.insights.totalAvailableStock": "Stock total disponible",
  "assistant.insights.historicalPriceBadge": "Precio real histórico",
  "assistant.insights.referencePriceBadge": "Precio base referencial",
  "assistant.insights.goToInventoryAction": "Ver inventario detallado",
  "assistant.insights.risksTitle": "Detección de Merma por Antigüedad",
  "assistant.insights.risksSubtitle":
    "Alerta preventiva para lotes almacenados por tiempo prolongado",
  "assistant.insights.atRiskLots": "Lotes en riesgo",
  "assistant.insights.atRiskWeight": "Peso en riesgo",
  "assistant.insights.moderateRisk": "Riesgo moderado (>15 días)",
  "assistant.insights.criticalRisk": "Riesgo crítico (>30 días)",
  "assistant.insights.optimalRisk": "Sin lotes en riesgo de merma",
  "assistant.insights.goToSalesAction": "Gestionar ventas",
  "assistant.insights.buyersTitle": "Compradores Sugeridos por Afinidad",
  "assistant.insights.buyersSubtitle":
    "Clientes que han comprado las categorías actualmente en stock",
  "assistant.insights.noBuyersMatched":
    "No se encontraron compradores con historial en las categorías disponibles.",
  "assistant.insights.historicalVolume": "Volumen histórico",
  "assistant.insights.lastPurchase": "Última compra",
  "assistant.insights.contact": "Contacto",
  "assistant.insights.goToBuyersAction": "Ver directorio de compradores",
  "assistant.clearConversation": "Limpiar conversación",
  "assistant.clearConversationAria": "Limpiar conversación y reiniciar mensajes",
  "categories.organic": "Orgánicos",
  "categories.recyclable": "Reciclables",
  "categories.nonRecyclable": "No aprovechables",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockGenerateAssistantResponseWithProvider = vi.fn();

vi.mock("../src/services/assistantService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/services/assistantService")>();
  return {
    ...actual,
    generateAssistantResponseWithProvider: (
      prompt: string,
      lang: "es" | "en",
      snapshots?: unknown,
    ) => mockGenerateAssistantResponseWithProvider(prompt, lang, snapshots),
  };
});

const mockInventory: RemoteWasteRecord[] = [
  {
    id: "w-1",
    recordNumber: "REC-01",
    containerId: "c-1",
    category: "recyclable",
    weightKg: 120,
    registeredAt: "2026-09-01T10:00:00.000Z", // Antiguo (> 30 días)
    status: "available",
  },
  {
    id: "w-2",
    recordNumber: "REC-02",
    containerId: "c-2",
    category: "organic",
    weightKg: 80,
    registeredAt: "2026-10-18T10:00:00.000Z",
    status: "available",
  },
];

const mockSales: SaleHistoryItem[] = [
  {
    id: "s-1",
    buyerId: "buyer-1",
    buyerName: "Empresa de Reciclaje Verde",
    wasteRecordId: "w-old",
    wasteRecordNumber: "REC-OLD",
    category: "recyclable",
    weightKg: 100,
    unitPrice: 1500,
    totalValue: 150000,
    soldAt: "2026-10-10T10:00:00.000Z",
  },
];

const mockBuyers: Buyer[] = [
  {
    id: "buyer-1",
    name: "Empresa de Reciclaje Verde",
    phone: "3001234567",
    email: "contacto@reciclajeverde.com",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("AssistantPanel con Motor de Diagnósticos Estratégicos (Tarea 088)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    cleanup();
  });

  test("a) renderiza los chips de análisis interactivo con atributos accesibles", () => {
    render(
      <MemoryRouter>
        <AssistantPanel
          initialInsightsData={{
            inventory: mockInventory,
            sales: mockSales,
            buyers: mockBuyers,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Diagnósticos estratégicos:")).toBeTruthy();

    const valChip = screen.getByRole("button", {
      name: "Valorizar inventario",
    });
    const risksChip = screen.getByRole("button", {
      name: "Riesgo de merma",
    });
    const buyersChip = screen.getByRole("button", {
      name: "Compradores sugeridos",
    });

    expect(valChip).toBeTruthy();
    expect(risksChip).toBeTruthy();
    expect(buyersChip).toBeTruthy();

    expect(valChip.getAttribute("aria-pressed")).toBe("false");
    expect(risksChip.getAttribute("aria-pressed")).toBe("false");
    expect(buyersChip.getAttribute("aria-pressed")).toBe("false");
  });

  test("b) al pulsar 'Valorizar inventario' despliega la tarjeta con cifras y enlace a /inventory", () => {
    const handleNavigateInventory = vi.fn();
    render(
      <MemoryRouter>
        <AssistantPanel
          onNavigateToInventory={handleNavigateInventory}
          initialInsightsData={{
            inventory: mockInventory,
            sales: mockSales,
            buyers: mockBuyers,
          }}
        />
      </MemoryRouter>,
    );

    const valChip = screen.getByRole("button", {
      name: "Valorizar inventario",
    });
    fireEvent.click(valChip);

    expect(valChip.getAttribute("aria-pressed")).toBe("true");

    const diagRegion = screen.getByRole("region", {
      name: "Valorización Económica de Stock",
    });
    expect(diagRegion).toBeTruthy();

    // Verificación de stock total y subtotales
    expect(screen.getByText("200 kg")).toBeTruthy();
    expect(screen.getByText("Ver inventario detallado")).toBeTruthy();

    // Clic en enlace a inventario
    const inventoryLink = screen.getByText("Ver inventario detallado");
    fireEvent.click(inventoryLink);
    expect(handleNavigateInventory).toHaveBeenCalled();

    // Cierre mediante botón X
    const closeBtn = screen.getByRole("button", {
      name: "Cerrar diagnóstico",
    });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("region")).toBeNull();
  });

  test("c) al pulsar 'Riesgo de merma' muestra la tarjeta de detección de merma y severidad", () => {
    render(
      <MemoryRouter>
        <AssistantPanel
          initialInsightsData={{
            inventory: mockInventory,
            sales: mockSales,
            buyers: mockBuyers,
          }}
        />
      </MemoryRouter>,
    );

    const risksChip = screen.getByRole("button", {
      name: "Riesgo de merma",
    });
    fireEvent.click(risksChip);

    const diagRegion = screen.getByRole("region", {
      name: "Detección de Merma por Antigüedad",
    });
    expect(diagRegion).toBeTruthy();

    // Estado crítico debido al lote con más de 30 días
    expect(screen.getByText("Riesgo crítico (>30 días)")).toBeTruthy();
    expect(screen.getByText("120 kg")).toBeTruthy();
  });

  test("d) al pulsar 'Compradores sugeridos' muestra recomendaciones comerciales con enlace a /buyers", () => {
    const handleNavigateBuyers = vi.fn();
    render(
      <MemoryRouter>
        <AssistantPanel
          onNavigateToBuyers={handleNavigateBuyers}
          initialInsightsData={{
            inventory: mockInventory,
            sales: mockSales,
            buyers: mockBuyers,
          }}
        />
      </MemoryRouter>,
    );

    const buyersChip = screen.getByRole("button", {
      name: "Compradores sugeridos",
    });
    fireEvent.click(buyersChip);

    const diagRegion = screen.getByRole("region", {
      name: "Compradores Sugeridos por Afinidad",
    });
    expect(diagRegion).toBeTruthy();

    expect(screen.getByText("Empresa de Reciclaje Verde")).toBeTruthy();
    expect(screen.getByText("Tel: 3001234567")).toBeTruthy();

    const buyersLink = screen.getByText("Ver directorio de compradores");
    fireEvent.click(buyersLink);
    expect(handleNavigateBuyers).toHaveBeenCalled();
  });

  test("e) muestra el distintivo 'Modo Local / Heurístico' en el mensaje inicial del asistente", () => {
    render(
      <MemoryRouter>
        <AssistantPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText("Modo Local / Heurístico")).toBeTruthy();
  });

  test("f) renderiza la respuesta con distintivo y formato estructurado al interactuar", async () => {
    mockGenerateAssistantResponseWithProvider.mockResolvedValueOnce({
      content: "📊 Resumen Operativo General de EcoPlaza",
      provider: "local_fallback",
    });

    render(
      <MemoryRouter>
        <AssistantPanel />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, { target: { value: "resumen general" } });
    fireEvent.click(sendButton);

    expect(await screen.findByText(/Resumen Operativo General/i)).toBeTruthy();
    const badges = screen.getAllByText("Modo Local / Heurístico");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  test("g) muestra el distintivo 'Gemini AI' y formato Markdown cuando la respuesta proviene del motor de IA", async () => {
    mockGenerateAssistantResponseWithProvider.mockResolvedValueOnce({
      content:
        "### Diagnóstico Gemini\n**Estrategia:** Priorizar la venta de reciclables acumulados en bodega.",
      provider: "gemini",
    });

    render(
      <MemoryRouter>
        <AssistantPanel />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", {
      name: "Escribe una consulta sobre residuos, ventas, inventario o telemetría IoT...",
    });
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, { target: { value: "¿Qué hacer con el stock?" } });
    fireEvent.click(sendButton);

    expect(await screen.findByText("Gemini AI")).toBeTruthy();
    expect(await screen.findByText(/Diagnóstico Gemini/)).toBeTruthy();
    expect(await screen.findByText(/Estrategia:/)).toBeTruthy();
  });

  test("h) limpia la conversación y restaura el saludo inicial al hacer clic en 'Limpiar conversación'", async () => {
    mockGenerateAssistantResponseWithProvider.mockResolvedValueOnce({
      content: "Respuesta de prueba antes de limpiar",
      provider: "local_fallback",
    });

    render(
      <MemoryRouter>
        <AssistantPanel />
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Enviar mensaje" });

    fireEvent.change(input, { target: { value: "¿Hola?" } });
    fireEvent.click(sendButton);

    expect(await screen.findByText("Respuesta de prueba antes de limpiar")).toBeTruthy();

    const clearButton = screen.getByRole("button", {
      name: /Limpiar conversación/i,
    });
    fireEvent.click(clearButton);

    expect(screen.queryByText("Respuesta de prueba antes de limpiar")).toBeNull();
    expect(screen.queryByText("¿Hola?")).toBeNull();
    expect(
      screen.getByText(/¡Hola! Soy el asistente inteligente de EcoPlaza/i),
    ).toBeTruthy();
  });
});

