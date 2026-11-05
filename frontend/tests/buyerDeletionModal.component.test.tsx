import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteBuyerModal from "../src/components/DeleteBuyerModal";
import type { Buyer } from "../src/services/buyerService";
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
    t: (key: string, defaultValueOrOptions?: unknown, options?: Record<string, unknown>) => {
      const defaultValue = typeof defaultValueOrOptions === "string" ? defaultValueOrOptions : undefined;
      const effectiveOptions =
        typeof defaultValueOrOptions === "object" && defaultValueOrOptions !== null
          ? (defaultValueOrOptions as Record<string, unknown>)
          : options;
      const keys = key.split(".");
      let val: unknown = es;
      for (const k of keys) {
        val = (val as Record<string, unknown>)?.[k];
      }
      if (typeof val === "string") {
        if (effectiveOptions?.name) return val.replace("{{name}}", String(effectiveOptions.name));
        return val;
      }
      return defaultValue ?? key;
    },
    i18n: { language: "es", changeLanguage: vi.fn(), resolvedLanguage: "es" },
  }),
}));

describe("DeleteBuyerModal Component - Eliminación Segura de Compradores", () => {
  const mockBuyers: Buyer[] = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      name: "BioRecicladora del Norte",
      email: "contacto@biorecicladora.co",
      phone: "3101234567",
      documentNumber: "900123456-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      purchaseCount: 0,
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      name: "EcoIndustrias Bogotá",
      email: "compras@ecoindustrias.co",
      phone: "3209876543",
      documentNumber: "800987654-2",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-04T00:00:00Z",
      purchaseCount: 4, // Con ventas: NO elegible para eliminación
    },
    {
      id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
      name: "Composteras Verdes S.A.S.",
      email: "ventas@composteras.co",
      phone: "3154443322",
      documentNumber: "901555666-3",
      createdAt: "2026-01-05T00:00:00Z",
      updatedAt: "2026-01-06T00:00:00Z",
      purchaseCount: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renderiza el modal accesible con role='dialog', título visible y advertencia de integridad comercial", () => {
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Eliminar comprador" })).toBeInTheDocument();
    expect(screen.getByTestId("delete-buyer-modal-title")).toBeInTheDocument();
    expect(
      screen.getByText(/Solo pueden eliminarse compradores sin historial de compras/i),
    ).toBeInTheDocument();
  });

  it("2. Filtra estrictamente los compradores con ventas: solo lista los de purchaseCount === 0", () => {
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-buyer-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // Solo 2 opciones elegibles (1 y 3), NO el comprador 2 (con ventas)
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(select.options[1].value).toBe("cccccccc-cccc-4ccc-8ccc-ccccccccccc3");
  });

  it("3. Permite seleccionar un comprador diferente y actualiza la confirmación visual", () => {
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-buyer-select");
    fireEvent.change(select, { target: { value: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3" } });

    expect(screen.getByText("Composteras Verdes S.A.S.")).toBeInTheDocument();
    expect(screen.getByText("901555666-3")).toBeInTheDocument();
  });

  it("4. Invoca onConfirm con el buyerId seleccionado al presionar el botón de eliminación", () => {
    const handleConfirm = vi.fn();
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const confirmButton = screen.getByTestId("confirm-delete-buyer-button");
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  });

  it("5. Deshabilita los controles y muestra estado de carga cuando isDeleting es true", () => {
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-buyer-select");
    const confirmButton = screen.getByTestId("confirm-delete-buyer-button");
    expect(select).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText("Eliminando comprador...")).toBeInTheDocument();
  });

  it("6. Muestra mensaje accesible y deshabilita confirmación cuando no hay compradores elegibles", () => {
    const buyersWithSalesOnly: Buyer[] = [
      {
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
        name: "Comprador Exclusivo",
        email: "exclusivo@test.co",
        phone: "3100000000",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        purchaseCount: 2,
      },
    ];

    render(
      <DeleteBuyerModal
        buyers={buyersWithSalesOnly}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay compradores sin historial de compras disponibles para eliminar."),
    ).toBeInTheDocument();
    const confirmButton = screen.getByTestId("confirm-delete-buyer-button");
    expect(confirmButton).toBeDisabled();
  });

  it("7. Invoca onClose al hacer clic en el botón Cancelar", () => {
    const handleClose = vi.fn();
    render(
      <DeleteBuyerModal
        buyers={mockBuyers}
        isDeleting={false}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />,
    );

    const cancelButton =
      screen.queryByTestId("cancel-delete-buyer-button") ||
      screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

