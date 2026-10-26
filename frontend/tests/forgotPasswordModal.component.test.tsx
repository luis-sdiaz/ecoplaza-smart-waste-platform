import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordModal, {
  type ForgotPasswordModalProps,
} from "../src/components/auth/ForgotPasswordModal";

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

const authMocks = vi.hoisted(() => ({
  requestPasswordRecovery: vi.fn(),
  verifyPasswordRecoveryOtp: vi.fn(),
  updateRecoveredPassword: vi.fn(),
  cancelPasswordRecovery: vi.fn(),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    requestPasswordRecovery: authMocks.requestPasswordRecovery,
    verifyPasswordRecoveryOtp: authMocks.verifyPasswordRecoveryOtp,
    updateRecoveredPassword: authMocks.updateRecoveredPassword,
    cancelPasswordRecovery: authMocks.cancelPasswordRecovery,
  }),
}));

// Mocks de i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      defaultValueOrOptions?:
        | string
        | { defaultValue?: string; email?: string; seconds?: number; [key: string]: unknown },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        if (defaultValueOrOptions.email && key === "recovery.verifyDescription") {
          return `Ingresa el código de 8 dígitos enviado a ${defaultValueOrOptions.email}.`;
        }
        return defaultValueOrOptions.defaultValue || key;
      }
      const translations: Record<string, string> = {
        "recovery.title": "Recupera tu contraseña",
        "recovery.description":
          "Ingresa tu correo electrónico para recibir un código de recuperación.",
        "recovery.close": "Cerrar recuperación de contraseña",
        "recovery.email": "Correo electrónico",
        "recovery.emailPlaceholder": "usuario@correo.com",
        "recovery.emailRequired": "Ingresa tu correo electrónico.",
        "recovery.emailInvalid": "Ingresa un correo electrónico válido.",
        "recovery.sendCode": "Enviar código",
        "recovery.sending": "Enviando código...",
        "recovery.verifyTitle": "Verifica el código",
        "recovery.otpLabel": "Código de recuperación",
        "recovery.otpPlaceholder": "00000000",
        "recovery.otpHelp": "Usa los 8 dígitos del correo más reciente.",
        "recovery.verifyCode": "Verificar código",
        "recovery.verifying": "Verificando código...",
        "recovery.newPasswordTitle": "Crea una contraseña nueva",
        "recovery.newPassword": "Nueva contraseña",
        "recovery.confirmPassword": "Confirmar contraseña",
        "recovery.updatePassword": "Actualizar contraseña",
      };
      return translations[key] ?? key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

describe("ForgotPasswordModal Component - Recuperación de Contraseña y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Polyfill defensivo para <dialog> en el entorno jsdom
    if (typeof HTMLDialogElement !== "undefined") {
      HTMLDialogElement.prototype.showModal = function mockShowModal(
        this: HTMLDialogElement,
      ) {
        this.setAttribute("open", "");
      };
      HTMLDialogElement.prototype.close = function mockClose(
        this: HTMLDialogElement,
      ) {
        this.removeAttribute("open");
      };
    }
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (
    propsOverrides: Partial<ForgotPasswordModalProps> = {},
  ) => {
    const defaultProps: ForgotPasswordModalProps = {
      isOpen: true,
      initialEmail: "",
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<ForgotPasswordModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza condicionalmente el diálogo modal cuando isOpen es true con roles WAI-ARIA", () => {
    renderComponent({ isOpen: true });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    expect(
      screen.getByRole("heading", { level: 2, name: "Recupera tu contraseña" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ingresa tu correo electrónico para recibir un código de recuperación.",
      ),
    ).toBeInTheDocument();
  });

  it("2. No se renderiza en el DOM cuando isOpen es false", () => {
    renderComponent({ isOpen: false });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Recupera tu contraseña")).toBeNull();
  });

  it("3. Renderiza campos del formulario con etiquetas semánticas y valor inicial precargado", () => {
    renderComponent({ isOpen: true, initialEmail: "operador@ecoplaza.com" });

    const emailInput = screen.getByLabelText("Correo electrónico");
    expect(emailInput).toBeInTheDocument();
    expect((emailInput as HTMLInputElement).value).toBe("operador@ecoplaza.com");

    const submitBtn = screen.getByRole("button", { name: "Enviar código" });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.getAttribute("type")).toBe("submit");
  });

  it("4. Permite cerrar el modal mediante el botón interactivo de descarte y la tecla Escape", () => {
    const handleClose = vi.fn();
    renderComponent({ isOpen: true, onClose: handleClose });

    const closeBtn = screen.getByRole("button", {
      name: "Cerrar recuperación de contraseña",
    });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(authMocks.cancelPasswordRecovery).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("5. Valida campos obligatorios y formato de correo electrónico antes del envío", async () => {
    renderComponent({ isOpen: true, initialEmail: "" });

    const submitBtn = screen.getByRole("button", { name: "Enviar código" });
    fireEvent.click(submitBtn);

    // Validación de requerido
    expect(
      screen.getByText("Ingresa tu correo electrónico."),
    ).toBeInTheDocument();
    expect(authMocks.requestPasswordRecovery).not.toHaveBeenCalled();

    // Validación de formato sintáctico
    const emailInput = screen.getByLabelText("Correo electrónico");
    fireEvent.change(emailInput, { target: { value: "correo-invalido" } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Ingresa un correo electrónico válido."),
    ).toBeInTheDocument();
    expect(authMocks.requestPasswordRecovery).not.toHaveBeenCalled();
  });

  it("6. Ejecuta el envío con email válido invocando requestPasswordRecovery y avanza a verificación OTP", async () => {
    authMocks.requestPasswordRecovery.mockResolvedValueOnce({
      ok: true,
      data: undefined,
    });

    renderComponent({ isOpen: true, initialEmail: "" });

    const emailInput = screen.getByLabelText("Correo electrónico");
    fireEvent.change(emailInput, { target: { value: "valido@ecoplaza.com" } });

    const submitBtn = screen.getByRole("button", { name: "Enviar código" });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(authMocks.requestPasswordRecovery).toHaveBeenCalledTimes(1);
    expect(authMocks.requestPasswordRecovery).toHaveBeenCalledWith(
      "valido@ecoplaza.com",
    );

    // Transición reactiva a la etapa de verificación con código OTP
    expect(
      screen.getByRole("heading", { level: 2, name: "Verifica el código" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Código de recuperación")).toBeInTheDocument();
  });
});

