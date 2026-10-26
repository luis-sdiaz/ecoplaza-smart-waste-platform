import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterModal, {
  type RegisterModalProps,
} from "../src/components/auth/RegisterModal";

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
  verifySignUpOtp: vi.fn(),
  signUpWithPassword: vi.fn(),
  resendSignUpOtp: vi.fn(),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    verifySignUpOtp: authMocks.verifySignUpOtp,
  }),
}));

vi.mock("../src/auth/supabaseAuth", () => ({
  signUpWithPassword: authMocks.signUpWithPassword,
  resendSignUpOtp: authMocks.resendSignUpOtp,
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
        if (defaultValueOrOptions.email && key === "register.verifyDescription") {
          return `Enviamos un código de 8 dígitos a ${defaultValueOrOptions.email}.`;
        }
        return defaultValueOrOptions.defaultValue || key;
      }
      const translations: Record<string, string> = {
        "register.title": "Crear cuenta",
        "register.description":
          "Regístrate para comenzar a gestionar residuos y recursos en EcoPlaza.",
        "register.close": "Cerrar registro",
        "register.fullName": "Nombre completo",
        "register.fullNamePlaceholder": "Tu nombre completo",
        "register.email": "Correo electrónico",
        "register.emailPlaceholder": "usuario@correo.com",
        "register.password": "Contraseña",
        "register.confirmPassword": "Confirmar contraseña",
        "register.showPassword": "Mostrar contraseña",
        "register.hidePassword": "Ocultar contraseña",
        "register.submit": "Crear cuenta",
        "register.creatingAccount": "Creando cuenta...",
        "register.hasAccount": "¿Ya tienes una cuenta?",
        "register.signIn": "Iniciar sesión",
        "register.fullNameRequired": "Ingresa tu nombre completo.",
        "register.fullNameLength":
          "El nombre debe tener entre 2 y 60 caracteres.",
        "register.emailRequired": "Ingresa tu correo electrónico.",
        "register.emailInvalid": "Ingresa un correo electrónico válido.",
        "register.passwordRequired": "Ingresa una contraseña.",
        "register.passwordLength":
          "La contraseña debe tener al menos 8 caracteres.",
        "register.confirmPasswordRequired": "Confirma tu contraseña.",
        "register.passwordMismatch": "Las contraseñas no coinciden.",
        "register.verifyTitle": "Verifica tu correo electrónico",
        "register.verifySubmit": "Verificar cuenta",
        "register.verifying": "Verificando cuenta...",
        "register.otpLabel": "Código de verificación",
        "register.otpPlaceholder": "00000000",
        "register.otpHelp": "Ingresa los 8 dígitos del correo más reciente.",
      };
      return translations[key] ?? key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

describe("RegisterModal Component - Modal de Registro de Usuario y Accesibilidad", () => {
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

  const renderComponent = (propsOverrides: Partial<RegisterModalProps> = {}) => {
    const defaultProps: RegisterModalProps = {
      isOpen: true,
      onClose: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<RegisterModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza condicionalmente el diálogo modal cuando isOpen es true con roles WAI-ARIA", () => {
    renderComponent({ isOpen: true });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    expect(screen.getByRole("heading", { level: 2, name: "Crear cuenta" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Regístrate para comenzar a gestionar residuos y recursos en EcoPlaza.",
      ),
    ).toBeInTheDocument();
  });

  it("2. No se renderiza en el DOM cuando isOpen es false", () => {
    renderComponent({ isOpen: false });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Crear cuenta")).toBeNull();
  });

  it("3. Renderiza campos del formulario con etiquetas semánticas vinculadas y botón accesible", () => {
    renderComponent({ isOpen: true });

    expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Crear cuenta" });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.getAttribute("type")).toBe("submit");
  });

  it("4. Permite cerrar el modal mediante el botón de cierre y mediante la tecla Escape", () => {
    const handleClose = vi.fn();
    renderComponent({ isOpen: true, onClose: handleClose });

    const closeBtn = screen.getByRole("button", { name: "Cerrar registro" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("5. Valida campos obligatorios y formato de contraseñas evitando envíos inválidos", async () => {
    renderComponent({ isOpen: true });

    const submitBtn = screen.getByRole("button", { name: "Crear cuenta" });
    fireEvent.click(submitBtn);

    // Validación de requeridos
    expect(screen.getByText("Ingresa tu nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu correo electrónico.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa una contraseña.")).toBeInTheDocument();

    // No debe haber llamado al servicio de registro
    expect(authMocks.signUpWithPassword).not.toHaveBeenCalled();

    // Contraseñas que no coinciden
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Carlos Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "carlos@ecoplaza.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña", { exact: true }), {
      target: { value: "Password123" },
    });
    fireEvent.change(
      screen.getByLabelText("Confirmar contraseña", { exact: true }),
      {
        target: { value: "DifferentPass456" },
      },
    );

    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
    expect(authMocks.signUpWithPassword).not.toHaveBeenCalled();
  });

  it("6. Ejecuta el envío con datos válidos, muestra estado de carga accesible y pasa al paso de verificación", async () => {
    authMocks.signUpWithPassword.mockResolvedValueOnce({
      ok: true,
      data: {
        user: { id: "user-123", email: "carlos@ecoplaza.com" },
        session: null,
        confirmationRequired: true,
      },
    });

    renderComponent({ isOpen: true });

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Carlos Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "carlos@ecoplaza.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña", { exact: true }), {
      target: { value: "Secret123!" },
    });
    fireEvent.change(
      screen.getByLabelText("Confirmar contraseña", { exact: true }),
      {
        target: { value: "Secret123!" },
      },
    );

    const submitBtn = screen.getByRole("button", { name: "Crear cuenta" });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(authMocks.signUpWithPassword).toHaveBeenCalledTimes(1);
    expect(authMocks.signUpWithPassword).toHaveBeenCalledWith({
      email: "carlos@ecoplaza.com",
      password: "Secret123!",
      fullName: "Carlos Pérez",
      persistence: "temporary",
    });

    // Pasa al paso de verificación (código OTP)
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verifica tu correo electrónico",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Código de verificación")).toBeInTheDocument();
  });
});
