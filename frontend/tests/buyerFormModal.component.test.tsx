import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerFormModal from "../src/components/BuyerFormModal";
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
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
}));

const mockBuyerToEdit = {
  id: "buy-123",
  name: "Recuperadora Bolívar S.A.S.",
  documentNumber: "901234567-8",
  phone: "3101234567",
  email: "contacto@bolivar.com",
  address: "Zona Industrial Lote 4",
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-02T12:00:00Z",
};

describe("BuyerFormModal Component - Gestión de Compradores y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (propsOverrides = {}) => {
    const defaultProps = {
      buyer: null,
      isSubmitting: false,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<BuyerFormModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it('1. Renderiza el modal accesible con role="dialog", título visible y campos iniciales vacíos en modo creación', () => {
    const { container } = renderModal();

    const dialog =
      screen.queryByRole("dialog") ||
      container.querySelector('[aria-modal="true"]');
    expect(dialog).toBeTruthy();

    expect(
      screen.getByText(/nuevo comprador|registrar comprador|crear comprador/i),
    ).toBeInTheDocument();

    const nameInput =
      screen.queryByLabelText(/nombre|razón social|name/i) ||
      screen.getByPlaceholderText(/nombre|razón social/i);
    expect((nameInput as HTMLInputElement).value).toBe("");
  });

  it("2. Bloquea el envío y muestra alertas de error visuales cuando los campos requeridos están vacíos", async () => {
    const { props } = renderModal();

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar|crear/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();

    await waitFor(() => {
      const errorElements =
        screen.queryAllByRole("alert") ||
        screen.getAllByText(/requerido|obligatorio|ingrese/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("3. Valida el formato de correo electrónico y rechaza formatos inválidos", async () => {
    const { props } = renderModal();

    const emailInput =
      screen.queryByLabelText(/correo|email/i) ||
      screen.getByPlaceholderText(/correo|email/i);

    fireEvent.change(emailInput, { target: { value: "correo-no-valido" } });

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("4. Precarga correctamente la información del comprador cuando se opera en modo edición", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderModal({ buyer: mockBuyerToEdit as any });

    expect(
      screen.getByText(/editar comprador|actualizar comprador/i),
    ).toBeInTheDocument();

    const nameInput =
      screen.queryByLabelText(/nombre|razón social|name/i) ||
      screen.getByDisplayValue("Recuperadora Bolívar S.A.S.");
    expect(nameInput).toBeInTheDocument();

    const docInput =
      screen.queryByLabelText(/documento|nit/i) ||
      screen.getByDisplayValue("901234567-8");
    expect(docInput).toBeInTheDocument();
  });

  it("5. Envía los datos sanitizados correctamente al registrar un nuevo comprador (Happy Path)", async () => {
    const { props } = renderModal();

    const nameInput =
      screen.queryByLabelText(/nombre|razón social|name/i) ||
      screen.getByPlaceholderText(/nombre|razón social/i);
    const docInput =
      screen.queryByLabelText(/documento|nit/i) ||
      screen.getByPlaceholderText(/documento|nit/i);
    const phoneInput =
      screen.queryByLabelText(/teléfono|phone/i) ||
      screen.getByPlaceholderText(/teléfono|celular/i);

    fireEvent.change(nameInput, { target: { value: "EcoMetales del Norte" } });
    fireEvent.change(docInput, { target: { value: "800555666-1" } });
    fireEvent.change(phoneInput, { target: { value: "3009876543" } });

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar|crear/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledTimes(1);
      const callData = props.onSubmit.mock.calls[0][0];
      expect(callData.name).toBe("EcoMetales del Norte");
      expect(callData.documentNumber).toBe("800555666-1");
    });
  });

  it("6. Deshabilita los botones de acción en isSubmitting e invoca onClose al cancelar", () => {
    const { props: submittingProps } = renderModal({ isSubmitting: true });

    const submitButton = screen.getByRole("button", {
      name: /guardando|procesando|guardar/i,
    });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(submittingProps.onSubmit).not.toHaveBeenCalled();

    // Limpieza de renderizado anterior y cancelación en estado normal
    cleanup();
    const { props: normalProps } = renderModal({ isSubmitting: false });
    const cancelButton =
      screen.queryByRole("button", { name: /cancelar|cancel/i }) ||
      screen.getByLabelText(/cerrar/i);

    fireEvent.click(cancelButton);
    expect(normalProps.onClose).toHaveBeenCalledTimes(1);
  });
});

