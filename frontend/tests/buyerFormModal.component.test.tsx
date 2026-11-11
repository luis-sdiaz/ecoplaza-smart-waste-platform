import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerFormModal from "../src/components/BuyerFormModal";
import es from "../src/i18n/translations/es";
import { validateBuyerInput } from "../src/services/buyerService";

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
  phone: "3101234567",
  email: "contacto@bolivar.com",
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

  it("valida defensivamente todas las combinaciones de contacto en el servicio", () => {
    expect(validateBuyerInput({ name: "Sin contacto", email: "", phone: "" })).toEqual({
      ok: false,
      error: { code: "missing_contact", retryable: false },
    });
    expect(validateBuyerInput({
      name: "Solo correo",
      email: " CONTACTO@EJEMPLO.COM ",
      phone: "",
    })).toMatchObject({
      ok: true,
      data: { email: "contacto@ejemplo.com", phone: null },
    });
    expect(validateBuyerInput({
      name: "Solo teléfono",
      email: "",
      phone: " 300 123 4567 ",
    })).toMatchObject({
      ok: true,
      data: { email: null, phone: "300 123 4567" },
    });
    expect(validateBuyerInput({
      name: "Contactos inválidos",
      email: "correo-invalido",
      phone: "abc",
    })).toMatchObject({
      ok: false,
      error: { code: "invalid_email" },
    });
    expect(validateBuyerInput({
      name: "Teléfono inválido",
      email: "contacto@ejemplo.com",
      phone: "abc",
    })).toMatchObject({
      ok: false,
      error: { code: "invalid_phone" },
    });
    expect(validateBuyerInput({
      name: "Ambos contactos",
      email: "ventas@ejemplo.com",
      phone: "+57 300 123 4567",
    })).toMatchObject({ ok: true });
  });

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

    const emailInput = screen.getByLabelText(/correo|email/i);
    const phoneInput = screen.getByLabelText(/teléfono|phone/i);
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(phoneInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("3. Valida el formato de correo electrónico y rechaza formatos inválidos", async () => {
    const { props } = renderModal();

    const emailInput =
      screen.queryByLabelText(/correo|email/i) ||
      screen.getByPlaceholderText(/correo|email/i);
    const nameInput = screen.getByLabelText(/nombre|razón social|name/i);

    fireEvent.change(nameInput, { target: { value: "Comprador válido" } });
    fireEvent.change(emailInput, { target: { value: "correo-no-valido" } });

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(emailInput);
  });

  it("muestra un error claro y enfoca el teléfono cuando su formato es inválido", () => {
    const { props } = renderModal();
    fireEvent.change(screen.getByLabelText(/nombre|name/i), {
      target: { value: "Comprador telefónico" },
    });
    const phoneInput = screen.getByLabelText(/teléfono|phone/i);
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(es.buyers.invalidPhone)).toBeInTheDocument();
    expect(phoneInput.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(phoneInput);
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

    expect(screen.queryByLabelText(/documento|nit/i)).toBeNull();
    expect(screen.queryByLabelText(/dirección|address/i)).toBeNull();
  });

  it("5. Permite registrar con solo teléfono válido", async () => {
    const { props } = renderModal();

    const nameInput =
      screen.queryByLabelText(/nombre|razón social|name/i) ||
      screen.getByPlaceholderText(/nombre|razón social/i);
    const phoneInput =
      screen.queryByLabelText(/teléfono|phone/i) ||
      screen.getByPlaceholderText(/teléfono|celular/i);

    fireEvent.change(nameInput, { target: { value: "EcoMetales del Norte" } });
    fireEvent.change(phoneInput, { target: { value: "3009876543" } });

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar|crear/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledTimes(1);
      const callData = props.onSubmit.mock.calls[0][0];
      expect(callData.name).toBe("EcoMetales del Norte");
      expect(callData.email).toBe("");
      expect(callData.phone).toBe("3009876543");
    });
  });

  it("6. Permite registrar con solo correo válido y con ambos contactos válidos", async () => {
    const emailOnly = renderModal();
    fireEvent.change(screen.getByLabelText(/nombre|name/i), {
      target: { value: "Comprador por correo" },
    });
    fireEvent.change(screen.getByLabelText(/correo|email/i), {
      target: { value: "contacto@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    expect(emailOnly.props.onSubmit).toHaveBeenCalledWith({
      name: "Comprador por correo",
      email: "contacto@ejemplo.com",
      phone: "",
    });

    cleanup();
    const bothContacts = renderModal();
    fireEvent.change(screen.getByLabelText(/nombre|name/i), {
      target: { value: "Comprador completo" },
    });
    fireEvent.change(screen.getByLabelText(/correo|email/i), {
      target: { value: "ventas@ejemplo.com" },
    });
    fireEvent.change(screen.getByLabelText(/teléfono|phone/i), {
      target: { value: "+57 300 123 4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    expect(bothContacts.props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("7. Mantiene visible un comprador antiguo sin contacto y valida únicamente al guardar", () => {
    const { props } = renderModal({
      buyer: {
        ...mockBuyerToEdit,
        email: null,
        phone: null,
      },
    });

    expect(screen.getByDisplayValue("Recuperadora Bolívar S.A.S.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(es.buyers.contactRequired)).toBeInTheDocument();
  });

  it("8. Deshabilita los botones de acción en isSubmitting e invoca onClose al cancelar", () => {
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

