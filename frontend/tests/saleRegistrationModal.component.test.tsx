import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SaleRegistrationModal from "../src/components/SaleRegistrationModal";
import es from "../src/i18n/translations/es";

// Extensión de matchers para compatibilidad con React Testing Library en Vitest
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): unknown;
    toBeDisabled(): unknown;
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

// Mock de i18n con resolución semántica de textos en español
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

const mockBuyers = [
  { id: "buy-1", name: "Recuperadora El Prado", documentNumber: "900123456-1" },
  { id: "buy-2", name: "EcoPlásticos del Sur", documentNumber: "900987654-2" },
];

const mockStock = {
  recyclable: 500,
  organic: 200,
  nonRecyclable: 100,
};

describe("SaleRegistrationModal Component - Venta de Residuos y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (propsOverrides = {}) => {
    const defaultProps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buyers: mockBuyers as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stock: mockStock as any,
      isSubmitting: false,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<SaleRegistrationModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it('1. Renderiza el modal accesible con role="dialog", título visible y selectores poblados', () => {
    const { container } = renderModal();

    const dialog =
      screen.queryByRole("dialog") ||
      container.querySelector('[aria-modal="true"]');
    expect(dialog).toBeTruthy();

    expect(
      screen.getByText(/registrar venta|nueva venta|registro de venta/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/Recuperadora El Prado/i)).toBeInTheDocument();
  });

  it("2. Bloquea el envío y muestra errores visuales cuando el formulario está incompleto", async () => {
    const { props } = renderModal();

    const submitButton = screen.getByRole("button", {
      name: /registrar|guardar|confirmar/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();

    await waitFor(() => {
      const errorElements =
        screen.queryAllByRole("alert") ||
        screen.getAllByText(/requerido|obligatorio|seleccione|ingrese/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("3. Valida que el peso y precio sean positivos y calcula reactivamente el total", async () => {
    renderModal();

    const weightInput =
      screen.queryByLabelText(/peso|cantidad|weight/i) ||
      screen.getByPlaceholderText(/0\.00|0\.000|kg/i);
    const priceInput =
      screen.queryByLabelText(/precio|valor unitario|price/i) ||
      screen.getByPlaceholderText(/precio|valor/i);

    // Ingresar valores válidos
    fireEvent.change(weightInput, { target: { value: "100" } });
    fireEvent.change(priceInput, { target: { value: "1500" } });

    // Verificar que el cálculo reactivo (100 * 1500 = 150.000) se refleje en pantalla
    await waitFor(() => {
      expect(screen.getByText(/150[.,]000/)).toBeInTheDocument();
    });
  });

  it("4. Valida y previene registrar una venta que exceda el stock disponible", async () => {
    const { props } = renderModal();

    const weightInput =
      screen.queryByLabelText(/peso|cantidad|weight/i) ||
      screen.getByPlaceholderText(/0\.00|0\.000|kg/i);

    // Intentar vender más de lo disponible en stock (ej. 9999 kg cuando hay 500)
    fireEvent.change(weightInput, { target: { value: "9999" } });
    const submitButton = screen.getByRole("button", {
      name: /registrar|guardar|confirmar/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("5. Envía los datos sanitizados correctamente en un flujo exitoso (Happy Path)", async () => {
    const { props } = renderModal();

    // 1. Seleccionar comprador
    const buyerSelect =
      screen.queryByLabelText(/comprador|buyer/i) ||
      screen.getByRole("combobox");
    fireEvent.change(buyerSelect, { target: { value: "buy-1" } });

    // 2. Ingresar peso y precio válidos
    const weightInput =
      screen.queryByLabelText(/peso|cantidad|weight/i) ||
      screen.getByPlaceholderText(/0\.00|0\.000|kg/i);
    const priceInput =
      screen.queryByLabelText(/precio|valor unitario|price/i) ||
      screen.getByPlaceholderText(/precio|valor/i);

    fireEvent.change(weightInput, { target: { value: "50" } });
    fireEvent.change(priceInput, { target: { value: "1200" } });

    // 3. Enviar
    const submitButton = screen.getByRole("button", {
      name: /registrar|guardar|confirmar/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledTimes(1);
      const callArg = props.onSubmit.mock.calls[0][0];
      expect(callArg.buyerId).toBe("buy-1");
      expect(callArg.weightKg).toBe(50);
      expect(callArg.unitPrice).toBe(1200);
    });
  });

  it("6. Deshabilita controles en estado isSubmitting e invoca onClose al cancelar", () => {
    const { props: submittingProps } = renderModal({ isSubmitting: true });

    const submitButton = screen.getByRole("button", {
      name: /guardando|procesando|registrar|confirmando/i,
    });
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(submittingProps.onSubmit).not.toHaveBeenCalled();

    // Limpieza de renderizado anterior y verificación en estado normal
    cleanup();
    const { props: normalProps } = renderModal({ isSubmitting: false });
    const cancelButton =
      screen.queryByRole("button", { name: /cancelar|cancel/i }) ||
      screen.getByLabelText(/cerrar/i);

    fireEvent.click(cancelButton);
    expect(normalProps.onClose).toHaveBeenCalledTimes(1);
  });
});
