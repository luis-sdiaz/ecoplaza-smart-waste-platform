import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AppLayout from "../src/layouts/AppLayout";

const translations: Record<string, string> = {
  "desktopDiagnostics.title": "Diagnóstico de Plataforma y Entorno",
  "desktopDiagnostics.openButtonAria":
    "Ver información de la plataforma y entorno",
  "desktopDiagnostics.minDimensions":
    "Dimensiones mínimas de ventana: 1024 x 700 px",
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
  "desktopDiagnostics.openButtonAria":
    "View platform and environment information",
  "desktopDiagnostics.minDimensions":
    "Minimum window dimensions: 1024 x 700 px",
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

vi.mock("../src/components/Sidebar", () => ({
  default: () => <nav data-testid="app-sidebar">Mocked Sidebar</nav>,
}));

describe("AppLayout header y unificación con marco nativo (Tarea 084)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = "es";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("a) Verificar que AppLayout renderice el botón accesible de diagnóstico de plataforma con su atributo aria-label correspondiente", () => {
    // 1. En español
    const { rerender } = render(
      <AppLayout>
        <div data-testid="main-content">Contenido Principal</div>
      </AppLayout>,
    );

    const infoBtnEs = screen.getByRole("button", {
      name: "Ver información de la plataforma y entorno",
    });
    expect(infoBtnEs).toBeTruthy();
    expect(infoBtnEs.getAttribute("aria-label")).toBe(
      "Ver información de la plataforma y entorno",
    );
    expect(screen.getByTestId("main-content").textContent).toBe(
      "Contenido Principal",
    );

    // 2. En inglés
    currentLang = "en";
    rerender(
      <AppLayout>
        <div data-testid="main-content">Main Content</div>
      </AppLayout>,
    );

    const infoBtnEn = screen.getByRole("button", {
      name: "View platform and environment information",
    });
    expect(infoBtnEn).toBeTruthy();
    expect(infoBtnEn.getAttribute("aria-label")).toBe(
      "View platform and environment information",
    );
  });

  test("b) Verificar que al hacer clic en el botón de información se despliegue el modal DesktopDiagnosticsModal", () => {
    render(
      <AppLayout>
        <div>Contenido de Prueba</div>
      </AppLayout>,
    );

    // Inicialmente el diálogo de diagnóstico no está presente en el DOM
    expect(screen.queryByRole("dialog")).toBeNull();

    // Clic en el botón Info de la barra superior
    const infoBtn = screen.getByRole("button", {
      name: "Ver información de la plataforma y entorno",
    });
    fireEvent.click(infoBtn);

    // El diálogo modal debe desplegarse de manera accesible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const title = screen.getByRole("heading", {
      name: "Diagnóstico de Plataforma y Entorno",
    });
    expect(title).toBeTruthy();
  });

  test("c) Verificar que NO existan botones ni toolbars con roles de control de ventana redundantes en el DOM de la aplicación", () => {
    // 1. En entorno estándar
    render(
      <AppLayout>
        <div>Contenido</div>
      </AppLayout>,
    );

    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.queryByRole("button", { name: /minimizar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /maximizar/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /cerrar aplicación/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /window controls/i }),
    ).toBeNull();

    // 2. Incluso en entorno donde Tauri 2 esté simulado en window
    const targetWindow = window as unknown as {
      __TAURI_INTERNALS__?: unknown;
    };
    targetWindow.__TAURI_INTERNALS__ = { invoke: vi.fn() };

    try {
      cleanup();
      render(
        <AppLayout>
          <div>Contenido</div>
        </AppLayout>,
      );

      // Confirmar que no se reintrodujeron controles de ventana redundantes
      expect(screen.queryByRole("toolbar")).toBeNull();
      expect(screen.queryByRole("button", { name: /minimizar/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /maximizar/i })).toBeNull();
      expect(
        screen.queryByRole("button", { name: /cerrar aplicación/i }),
      ).toBeNull();
    } finally {
      delete targetWindow.__TAURI_INTERNALS__;
    }
  });
});

