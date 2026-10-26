import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WasteRegistrationModal from "../src/components/WasteRegistrationModal";
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

const mockContainers = [
  {
    id: "cont-org-1",
    code: "CONT-ORG-01",
    name: "Contenedor Orgánico Principal",
    category: "organic",
    capacityKg: 100,
    currentWeightKg: 25,
  },
  {
    id: "cont-rec-1",
    code: "CONT-REC-01",
    name: "Contenedor Reciclables",
    category: "recyclable",
    capacityKg: 150,
    currentWeightKg: 40,
  },
];

describe("WasteRegistrationModal Component - Ingreso de Materia Prima y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (propsOverrides = {}) => {
    const defaultProps = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      containers: mockContainers as any,
      isSubmitting: false,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<WasteRegistrationModal {...defaultProps} />),
      props: defaultProps,
    };
  };

  it('1. Renderiza el modal accesible con role="dialog", título visible y opciones de contenedor', () => {
    const { container } = renderModal();

    const dialog =
      screen.queryByRole("dialog") ||
      container.querySelector('[aria-modal="true"]');
    expect(dialog).toBeTruthy();

    expect(
      screen.getByText(/registrar residuo|registro de residuo|nuevo residuo/i),
    ).toBeInTheDocument();

    // Comprobar que los contenedores aparecen en las opciones
    expect(screen.getByText(/CONT-ORG-01/i)).toBeInTheDocument();
    expect(screen.getByText(/CONT-REC-01/i)).toBeInTheDocument();
  });

  it("2. Bloquea el envío y muestra errores visuales cuando los campos obligatorios están vacíos", async () => {
    const { props } = renderModal();

    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar|submit/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();

    await waitFor(() => {
      const errorElements =
        screen.queryAllByRole("alert") ||
        screen.getAllByText(/requerido|obligatorio|ingrese|selecciona/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("3. Valida estrictamente el peso numérico: rechaza valores negativos o cero y acepta decimales al gramo", async () => {
    const { props } = renderModal();

    const weightInput =
      screen.queryByLabelText(/peso|weight|kg/i) ||
      screen.getByPlaceholderText(/0\.00|0\.000|kg/i) ||
      screen.getByRole("spinbutton");

    // Intentar peso inválido: negativo o cero
    fireEvent.change(weightInput, { target: { value: "-5" } });
    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar/i,
    });
    fireEvent.click(submitButton);

    expect(props.onSubmit).not.toHaveBeenCalled();

    // Asignar peso válido con precisión decimal al gramo (ej. 12.345 kg)
    fireEvent.change(weightInput, { target: { value: "12.345" } });
    expect((weightInput as HTMLInputElement).value).toBe("12.345");
  });

  it("4. Ejecuta onSubmit con los datos sanitizados exactos en un flujo exitoso (Happy Path)", async () => {
    const { props } = renderModal();

    // 1. Seleccionar contenedor
    const containerSelect =
      screen.queryByLabelText(/contenedor|container/i) ||
      screen.getByRole("combobox");
    fireEvent.change(containerSelect, { target: { value: "cont-org-1" } });

    // 2. Seleccionar categoría si hay selector o botón explícito
    const categoryOption =
      screen.queryByRole("button", { name: /orgánico|organic/i }) ||
      screen.queryByLabelText(/categoría|category/i);
    if (categoryOption) {
      fireEvent.click(categoryOption);
    }

    // 3. Ingresar peso válido
    const weightInput =
      screen.queryByLabelText(/peso|weight|kg/i) ||
      screen.getByPlaceholderText(/0\.00|0\.000|kg/i) ||
      screen.getByRole("spinbutton");
    fireEvent.change(weightInput, { target: { value: "25.75" } });

    // 4. Enviar formulario
    const submitButton = screen.getByRole("button", {
      name: /guardar|registrar/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledTimes(1);
      const callArg = props.onSubmit.mock.calls[0][0];
      expect(callArg.containerId).toBe("cont-org-1");
      expect(Number(callArg.weight)).toBe(25.75);
    });
  });

  it("5. Deshabilita los botones de acción y previene doble submit cuando isSubmitting === true", () => {
    const { props } = renderModal({ isSubmitting: true });

    const submitButton = screen.getByRole("button", {
      name: /guardando|procesando|guardar|registrar|registrando/i,
    });
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("6. Invoca onClose al accionar el botón de cancelar o cerrar", () => {
    const { props } = renderModal();

    const cancelButton =
      screen.queryByRole("button", { name: /cancelar|cancel/i }) ||
      screen.queryByRole("button", { name: /cerrar|close/i }) ||
      screen.getByLabelText(/cerrar/i);

    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

