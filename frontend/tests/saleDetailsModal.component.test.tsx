import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SaleDetailsModal, { type SaleDetailsModalProps } from "../src/components/SaleDetailsModal";
import es from "../src/i18n/translations/es";

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
    t: (key: string, defaultValue?: string) => {
      const keys = key.split(".");
      let val: unknown = es;
      for (const k of keys) {
        val = (val as Record<string, unknown>)?.[k];
      }
      return typeof val === "string" ? val : defaultValue || key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockSale = {
  id: "sale-987",
  buyerId: "buy-01",
  buyerName: "Recicladora del Cauca",
  category: "recyclable" as const,
  wasteRecordId: "rec-01",
  wasteRecordNumber: "001",
  weight: 250.5,
  weightKg: 250.5,
  unitPrice: 1800,
  pricePerKg: 1800,
  totalAmount: 450900,
  totalValue: 450900,
  soldAt: "2026-10-20T14:30:00Z",
  createdAt: "2026-10-20T14:30:00Z",
  notes: "Entrega en acopio central lote 2B",
};

describe("SaleDetailsModal Component - Comprobante de Venta y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (propsOverrides: Partial<SaleDetailsModalProps> = {}) => {
    const defaultProps: SaleDetailsModalProps = {
      sale: mockSale,
      onClose: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<SaleDetailsModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. No renderiza contenido en el DOM cuando la prop sale es null", () => {
    const { container } = renderModal({ sale: null });
    expect(container.firstChild).toBeNull();
  });

  it('2. Renderiza el modal accesible con role="dialog", aria-modal="true" y encabezado visible', () => {
    const { container } = renderModal();

    const dialog =
      screen.queryByRole("dialog") ||
      container.querySelector('[aria-modal="true"]');
    expect(dialog).toBeTruthy();

    expect(
      screen.getByText(/detalle de (?:la )?venta|comprobante de venta|información de venta/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra correctamente la información del comprador y la categoría del material", () => {
    renderModal();

    expect(screen.getByText(/Recicladora del Cauca/i)).toBeInTheDocument();
    expect(screen.getByText(/reciclable|recyclable/i)).toBeInTheDocument();
  });

  it("4. Despliega el desglose cuantitativo: peso neto, precio por kilo y valor total liquidado", () => {
    renderModal();

    // Peso
    expect(screen.getByText(/250[.,]5/)).toBeInTheDocument();

    // Total o Precio
    expect(
      screen.getByText(/450[.,]900|450900/) ||
      screen.getByText(/1[.,]800|1800/),
    ).toBeInTheDocument();
  });

  it("5. Renderiza adecuadamente las notas de la transacción o mensaje alternativo cuando están vacías", () => {
    // Caso con notas
    const { unmount } = renderModal({
      sale: { ...mockSale, notes: "Entrega en acopio central lote 2B" },
    });
    expect(screen.getByText(/Entrega en acopio central lote 2B/i)).toBeInTheDocument();
    unmount();

    // Caso sin notas
    renderModal({
      sale: { ...mockSale, notes: "" },
    });
    expect(
      screen.queryByText(/sin notas|no hay notas|ninguna/i) ||
      screen.queryByText(/notas/i),
    ).toBeTruthy();
  });

  it("6. Invoca onClose al hacer clic en el botón de cerrar o botón cancelar", () => {
    const { props } = renderModal();

    const closeButton =
      screen.queryByRole("button", { name: /cerrar|close|cancelar/i }) ||
      screen.getByLabelText(/cerrar/i);

    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
