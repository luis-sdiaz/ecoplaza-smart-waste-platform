import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPanel from "../src/components/SettingsPanel";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { DemoVisibilityProvider } from "../src/context/DemoVisibilityProvider";
import i18n from "../src/i18n/config";

// Extensión de matcher toBeInTheDocument para compatibilidad con React Testing Library en Vitest
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

describe("SettingsPanel Component - Preferencias de Usuario y Accesibilidad UI/UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage?.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";

    // Polyfill defensivo para <dialog> en el entorno jsdom
    if (typeof HTMLDialogElement !== "undefined") {
      HTMLDialogElement.prototype.showModal = function mockShowModal(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      };
      HTMLDialogElement.prototype.close = function mockClose(this: HTMLDialogElement) {
        this.removeAttribute("open");
      };
    }
  });

  afterEach(() => {
    cleanup();
    window.localStorage?.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  const renderSettingsPanel = () => {
    return render(
      <ThemeProvider>
        <DemoVisibilityProvider>
          <SettingsPanel />
        </DemoVisibilityProvider>
      </ThemeProvider>,
    );
  };

  it("1. Renderiza adecuadamente las secciones principales de configuración y sus controles interactivos", () => {
    renderSettingsPanel();

    // Verificación de secciones principales mediante encabezados y textos clave
    expect(
      screen.getByRole("heading", { name: /preferencias generales|general/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /contenedor de demostración|demo/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /apariencia|appearance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /restablecer preferencias|reset/i,
      }),
    ).toBeInTheDocument();

    // Verificación de controles interactivos accesibles
    expect(
      screen.getByRole("button", { name: /español|spanish/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /english|inglés/i }),
    ).toBeInTheDocument();

    const lightRadio = screen.getByRole("radio", { name: /claro|light/i });
    const darkRadio = screen.getByRole("radio", { name: /oscuro|dark/i });
    expect(lightRadio).toBeInTheDocument();
    expect(darkRadio).toBeInTheDocument();

    const resetButton = screen.getByRole("button", {
      name: /restablecer preferencias|reset preferences/i,
    });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("2. Permite alternar la preferencia de tema (claro/oscuro) invocando la función y reflejando el estado", () => {
    renderSettingsPanel();

    const darkThemeButton = screen.getByRole("radio", {
      name: /oscuro|dark/i,
    });
    const lightThemeButton = screen.getByRole("radio", {
      name: /claro|light/i,
    });

    // Activar tema oscuro
    fireEvent.click(darkThemeButton);

    expect(darkThemeButton.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Retornar a tema claro
    fireEvent.click(lightThemeButton);

    expect(lightThemeButton.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("3. Permite cambiar la preferencia de idioma invocando i18n.changeLanguage con la opción seleccionada", () => {
    const changeLanguageSpy = vi.spyOn(i18n, "changeLanguage");

    renderSettingsPanel();

    const englishButton = screen.getByRole("button", {
      name: /english|inglés/i,
    });
    fireEvent.click(englishButton);

    expect(changeLanguageSpy).toHaveBeenCalledWith("en");

    const spanishButton = screen.getByRole("button", {
      name: /español|spanish/i,
    });
    fireEvent.click(spanishButton);

    expect(changeLanguageSpy).toHaveBeenCalledWith("es");

    changeLanguageSpy.mockRestore();
  });

  it("4. El botón de restablecer preferencias abre el diálogo modal de confirmación con opciones accesibles", () => {
    renderSettingsPanel();

    // Inicialmente el diálogo no debe estar montado en el DOM
    expect(screen.queryByRole("dialog")).toBeNull();

    // Clic en el botón que abre el diálogo
    const openDialogButton = screen.getByRole("button", {
      name: /restablecer preferencias|reset preferences/i,
    });
    fireEvent.click(openDialogButton);

    // El diálogo modal debe estar visible con rol accesible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Verificación de botones Cancelar y Confirmar dentro del diálogo modal
    const cancelButton = within(dialog).getByRole("button", {
      name: /cancelar|cancel/i,
    });
    const confirmButton = within(dialog).getByRole("button", {
      name: /^restablecer$|^confirm$/i,
    });
    expect(cancelButton).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();

    // Cancelar cierra el diálogo modal
    fireEvent.click(cancelButton);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

