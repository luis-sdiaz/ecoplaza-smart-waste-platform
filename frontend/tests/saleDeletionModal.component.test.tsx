import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteSaleModal from "../src/components/DeleteSaleModal";
import type { SaleHistoryItem } from "../src/services/salesService";
import es from "../src/i18n/translations/es";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
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
  toBeDisabled(received: Element | null) {
    const pass =
      received !== null &&
      ("disabled" in received
        ? Boolean((received as HTMLButtonElement).disabled)
        : received.hasAttribute("disabled") ||
          received.getAttribute("aria-disabled") === "true");
    return {
      pass,
      message: () =>
        pass
          ? "Expected element not to be disabled"
          : "Expected element to be disabled",
    };
  },
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const keys = key.split(".");
      let val: unknown = es;
      for (const k of keys) {
        val = (val as Record<string, unknown>)?.[k];
      }
      if (typeof val === "string") {
        if (options?.name) return val.replace("{{name}}", String(options.name));
        return val;
      }
      return key;
    },
    i18n: { language: "es", changeLanguage: vi.fn(), resolvedLanguage: "es" },
  }),
}));

describe("DeleteSaleModal Component - Eliminación Segura de Ventas", () => {
  const mockSales: SaleHistoryItem[] = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      buyerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      wasteRecordId: "wwwwwwww-wwww-4www-8www-wwwwwwwwwww1",
      weightKg: 25.5,
      unitPrice: 1200,
      totalValue: 30600,
      soldAt: "2026-10-15T14:30:00Z",
      buyerName: "BioRecicladora del Norte",
      wasteRecordNumber: "1",
      category: "recyclable",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      buyerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      wasteRecordId: "wwwwwwww-wwww-4www-8www-wwwwwwwwwww2",
      weightKg: 100,
      unitPrice: 500,
      totalValue: 50000,
      soldAt: "2026-10-16T10:00:00Z",
      buyerName: "Composteras de la Sabana",
      wasteRecordNumber: "2",
      category: "organic",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renderiza el modal accesible con role='dialog', título y advertencia de inventario", () => {
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Eliminar venta" })).toBeInTheDocument();
    expect(
      screen.getByText(/Al eliminar esta venta, el residuo volverá a estar disponible en el inventario activo/i),
    ).toBeInTheDocument();
  });

  it("2. Carga todas las ventas en el selector con sus detalles", () => {
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-sale-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe(mockSales[0].id);
    expect(select.options[1].value).toBe(mockSales[1].id);
  });

  it("3. Muestra el resumen detallado de la venta seleccionada inicialmente", () => {
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("SAL-11111111")).toBeInTheDocument();
    expect(screen.getByText("BioRecicladora del Norte")).toBeInTheDocument();
    expect(screen.getByText("(RES-001)")).toBeInTheDocument();
    expect(screen.getByText("25,5 kg")).toBeInTheDocument();
  });

  it("4. Actualiza los detalles al cambiar la venta seleccionada en el selector", () => {
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-sale-select");
    fireEvent.change(select, { target: { value: mockSales[1].id } });

    expect(screen.getByText("SAL-22222222")).toBeInTheDocument();
    expect(screen.getByText("Composteras de la Sabana")).toBeInTheDocument();
    expect(screen.getByText("(RES-002)")).toBeInTheDocument();
    expect(screen.getByText("100 kg")).toBeInTheDocument();
  });

  it("5. Invoca onConfirm con el id de la venta seleccionada al pulsar Eliminar venta", () => {
    const handleConfirm = vi.fn();
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const confirmButton = screen.getByTestId("confirm-delete-sale-button");
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith(mockSales[0].id);
  });

  it("6. Deshabilita los controles y muestra estado de carga cuando isDeleting es true", () => {
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-sale-select");
    expect(select).toBeDisabled();

    const confirmButton = screen.getByTestId("confirm-delete-sale-button");
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText("Eliminando venta...")).toBeInTheDocument();
  });

  it("7. Muestra mensaje informativo y deshabilita confirmación cuando la lista está vacía", () => {
    render(
      <DeleteSaleModal
        sales={[]}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay ventas registradas disponibles para eliminar."),
    ).toBeInTheDocument();
    const confirmButton = screen.getByTestId("confirm-delete-sale-button");
    expect(confirmButton).toBeDisabled();
  });

  it("8. Invoca onClose al hacer clic en el botón Cancelar", () => {
    const handleClose = vi.fn();
    render(
      <DeleteSaleModal
        sales={mockSales}
        isDeleting={false}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

