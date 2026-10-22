import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DesktopDiagnosticsModal from "../src/components/DesktopDiagnosticsModal";
import * as tauriService from "../src/services/tauriService";

const translations: Record<string, string> = {
  "desktopDiagnostics.title": "Diagnóstico de Plataforma y Entorno",
  "desktopDiagnostics.openButtonAria": "Ver información de la plataforma y entorno",
  "desktopDiagnostics.minDimensions": "Dimensiones mínimas de ventana: 1024 x 700 px",
  "desktopDiagnostics.close": "Cerrar diagnóstico",
  "settings.appVersionLabel": "Versión de la plataforma",
  "settings.runtimeModeLabel": "Modo de ejecución",
  "settings.runtimeWeb": "Navegador Web",
  "settings.runtimeDesktop": "Escritorio Nativo (Tauri 2)",
  "settings.nativeDialogsLabel": "Gestor de archivos",
  "settings.nativeDialogsSupported": "Diálogos nativos del sistema",
  "settings.nativeDialogsFallback": "Descargas directas del navegador",
};

const englishTranslations: Record<string, string> = {
  "desktopDiagnostics.title": "Platform & Environment Diagnostics",
  "desktopDiagnostics.openButtonAria": "View platform and environment information",
  "desktopDiagnostics.minDimensions": "Minimum window dimensions: 1024 x 700 px",
  "desktopDiagnostics.close": "Close diagnostics",
  "settings.appVersionLabel": "Platform version",
  "settings.runtimeModeLabel": "Execution mode",
  "settings.runtimeWeb": "Web Browser",
  "settings.runtimeDesktop": "Native Desktop (Tauri 2)",
  "settings.nativeDialogsLabel": "File manager",
  "settings.nativeDialogsSupported": "Native system dialogs",
  "settings.nativeDialogsFallback": "Direct browser downloads",
};

let currentLang = "es";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dict = currentLang === "en" ? englishTranslations : translations;
      return dict[key] ?? key;
    },
    i18n: { resolvedLanguage: currentLang, changeLanguage: vi.fn() },
  }),
}));

describe("DesktopDiagnosticsModal component (Tarea 082)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = "es";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("a) Verificar renderizado accesible del modal al abrirse (role='dialog' y atributos ARIA)", () => {
    const { container, rerender } = render(
      <DesktopDiagnosticsModal isOpen={false} onClose={vi.fn()} />,
    );

    // Si isOpen es false, el modal no se renderiza en el DOM
    expect(container.firstChild).toBeNull();

    rerender(<DesktopDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("desktop-diag-title");

    const heading = screen.getByRole("heading", {
      name: "Diagnóstico de Plataforma y Entorno",
    });
    expect(heading).toBeTruthy();
    expect(heading.id).toBe("desktop-diag-title");
  });

  test("b) Verificar presencia de versión, distintivo de runtime e información de dimensiones", () => {
    // 1. Entorno Web por defecto
    const { rerender } = render(
      <DesktopDiagnosticsModal isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText("v1.0.0")).toBeTruthy();
    expect(screen.getByText("Versión de la plataforma")).toBeTruthy();
    expect(screen.getByText("Navegador Web")).toBeTruthy();
    expect(screen.getByText("Gestor de archivos")).toBeTruthy();
    expect(screen.getByText("Descargas directas del navegador")).toBeTruthy();
    expect(
      screen.getByText("Dimensiones mínimas de ventana: 1024 x 700 px"),
    ).toBeTruthy();

    // 2. Entorno Escritorio Tauri 2
    vi.spyOn(tauriService, "getAppPlatformInfo").mockReturnValue({
      isDesktop: true,
      platform: "windows",
      version: "1.0.0",
    });
    vi.spyOn(tauriService, "isNativeDialogSupported").mockReturnValue(true);

    rerender(<DesktopDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Escritorio Nativo (Tauri 2)")).toBeTruthy();
    expect(screen.getByText("Diálogos nativos del sistema")).toBeTruthy();

    // 3. Internacionalización en inglés
    currentLang = "en";
    rerender(<DesktopDiagnosticsModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "Platform & Environment Diagnostics",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Platform version")).toBeTruthy();
    expect(
      screen.getByText("Minimum window dimensions: 1024 x 700 px"),
    ).toBeTruthy();
  });

  test("c) Validar cierre interactivo al pulsar el botón de cerrar", () => {
    const handleClose = vi.fn();
    render(<DesktopDiagnosticsModal isOpen={true} onClose={handleClose} />);

    // Botones de cierre (X en cabecera y botón en footer)
    const closeButtons = screen.getAllByRole("button", {
      name: "Cerrar diagnóstico",
    });
    expect(closeButtons.length).toBe(2);

    // Clic en el botón X de cabecera
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clic en el botón del pie
    fireEvent.click(closeButtons[1]);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

