import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerPurchaseHistoryModal from "../src/components/BuyerPurchaseHistoryModal";
import type { Buyer } from "../src/services/buyerService";
import type { SaleHistoryItem } from "../src/services/salesService";

// Extensión de matchers para compatibilidad con React Testing Library en Vitest
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): unknown;
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

afterEach(cleanup);

// Mocks de i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      if (typeof options === "object" && options !== null && "name" in options) {
        return `${key} ${String(options.name)}`;
      }
      if (typeof options === "string") return options;
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockBuyer: Buyer = {
  id: "buyer-abc-123",
  name: "Recuperadora Bolívar S.A.S.",
  documentNumber: "901234567-8",
  phone: "3101234567",
  email: "contacto@bolivar.com",
  address: "Zona Industrial Lote 4",
  status: "active",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
};

const mockSales: SaleHistoryItem[] = [
  {
    id: "sale-001",
    buyerId: "buyer-abc-123",
    wasteRecordId: "waste-001",
    weightKg: 15.5,
    unitPrice: 1200,
    totalValue: 18600,
    soldAt: "2026-10-15T10:00:00.000Z",
    buyerName: "Recuperadora Bolívar S.A.S.",
    wasteRecordNumber: "REC-001",
    category: "recyclable",
  },
  {
    id: "sale-002",
    buyerId: "buyer-abc-123",
    wasteRecordId: "waste-002",
    weightKg: 20.0,
    unitPrice: 800,
    totalValue: 16000,
    soldAt: "2026-10-16T14:30:00.000Z",
    buyerName: "Recuperadora Bolívar S.A.S.",
    wasteRecordNumber: "REC-002",
    category: "organic",
  },
];

describe("BuyerPurchaseHistoryModal Component - Historial Operativo de Compras y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renderiza condicionalmente el diálogo modal cuando isOpen es true con roles WAI-ARIA y encabezado descriptivo", () => {
    render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={mockSales}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
        isOpen={true}
        testId="buyer-purchase-history-modal"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("buyer-history-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("buyer-history-description");

    const heading = screen.getByRole("heading", { name: "buyers.purchaseHistoryTitle" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/Recuperadora Bolívar S\.A\.S\./i)).toBeInTheDocument();
  });

  it("2. No renderiza ningún elemento en el DOM cuando isOpen es false", () => {
    render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={mockSales}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
        isOpen={false}
        testId="buyer-purchase-history-modal"
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("buyer-purchase-history-modal")).toBeNull();
    expect(screen.queryByText("buyers.purchaseHistoryTitle")).toBeNull();
  });

  it("3. Permite cerrar el modal de manera accesible mediante el botón de cierre con aria-label y mediante tecla Escape", () => {
    const onCloseMock = vi.fn();

    render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={mockSales}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={onCloseMock}
      />,
    );

    const closeButton = screen.getByRole("button", { name: "buyers.closePurchaseHistory" });
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it("4. Valida rangos de fecha inconsistentes emitiendo alerta accesible (role='alert') y deshabilitando acciones de exportación", () => {
    render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={mockSales}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const startInput = screen.getByLabelText("buyers.purchaseStartDate") as HTMLInputElement;
    const endInput = screen.getByLabelText("buyers.purchaseEndDate") as HTMLInputElement;

    // Rango inválido: fecha de inicio posterior a fecha de fin
    fireEvent.change(startInput, { target: { value: "2026-10-20" } });
    fireEvent.change(endInput, { target: { value: "2026-10-10" } });

    const alertMsg = screen.getByRole("alert");
    expect(alertMsg).toBeInTheDocument();
    expect(alertMsg.textContent).toContain("buyers.invalidPurchaseDateRange");

    const csvBtn = screen.getByRole("button", { name: "buyers.exportPurchases" });
    const excelBtn = screen.getByRole("button", { name: "buyers.exportPurchasesExcel" });
    expect((csvBtn as HTMLButtonElement).disabled).toBe(true);
    expect((excelBtn as HTMLButtonElement).disabled).toBe(true);

    // Restaurar con el botón de limpiar fechas
    const clearBtn = screen.getByRole("button", { name: "buyers.clearPurchaseDates" });
    expect((clearBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(clearBtn);

    expect(startInput.value).toBe("");
    expect(endInput.value).toBe("");
    expect(screen.queryByText("buyers.invalidPurchaseDateRange")).toBeNull();
  });

  it("5. Presenta alerta semántica accesible (role='alert') y botón de reintento funcional cuando la prop error está activa", () => {
    const onRetryMock = vi.fn();

    render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={[]}
        isLoading={false}
        error="buyers.purchaseHistoryError"
        onRetry={onRetryMock}
        onClose={vi.fn()}
      />,
    );

    const alertElement = screen.getByRole("alert");
    expect(alertElement).toBeInTheDocument();
    expect(screen.getByText("buyers.purchaseHistoryError")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "buyers.retry" });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it("6. Soporta estado de carga accesible (role='status'), estado vacío cuando no hay ventas y estructura semántica de tabla accesible", () => {
    const { rerender } = render(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={[]}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Estado de carga accesible
    const loadingStatus = screen.getByRole("status");
    expect(loadingStatus).toBeInTheDocument();
    expect(screen.getByText("buyers.loadingPurchaseHistory")).toBeInTheDocument();

    // Estado vacío cuando no hay ventas
    rerender(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("buyers.noPurchasesTitle")).toBeInTheDocument();
    expect(screen.getByText("buyers.noPurchasesDescription")).toBeInTheDocument();

    // Con ventas cargadas: tabla semántica y tarjetas KPI
    rerender(
      <BuyerPurchaseHistoryModal
        buyer={mockBuyer}
        sales={mockSales}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("buyers.purchaseCount")).toBeInTheDocument();
    expect(screen.getByText("buyers.totalPurchasedWeight")).toBeInTheDocument();
    expect(screen.getByText("buyers.totalPurchasedValue")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    const caption = table.querySelector("caption");
    expect(caption).toBeInTheDocument();
    expect(caption?.textContent).toBe("buyers.purchaseHistoryTitle");

    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.length).toBe(4);
  });
});

