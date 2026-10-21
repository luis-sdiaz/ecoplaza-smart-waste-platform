import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SystemInfoCard from "../src/components/SystemInfoCard";
import SettingsPage from "../src/pages/SettingsPage";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { DemoVisibilityProvider } from "../src/context/DemoVisibilityProvider";
import * as tauriService from "../src/services/tauriService";

const translations: Record<string, string> = {
  "settings.eyebrow": "Preferencias del sistema",
  "settings.title": "Configuración",
  "settings.description": "Administra las preferencias generales y parámetros de EcoPlaza.",
  "settings.general": "Preferencias generales",
  "settings.generalDescription": "Configura las preferencias principales de EcoPlaza.",
  "settings.systemInfoTitle": "Información del Sistema y Entorno",
  "settings.systemInfoDescription":
    "Diagnóstico del runtime de ejecución y capacidades de la plataforma.",
  "settings.appVersionLabel": "Versión de la plataforma",
  "settings.runtimeModeLabel": "Modo de ejecución",
  "settings.runtimeWeb": "Navegador Web",
  "settings.runtimeDesktop": "Escritorio Nativo (Tauri 2)",
  "settings.nativeDialogsLabel": "Gestor de archivos",
  "settings.nativeDialogsSupported": "Diálogos nativos del sistema",
  "settings.nativeDialogsFallback": "Descargas directas del navegador",
  "settings.appearance": "Apariencia",
  "settings.appearanceDescription": "Personaliza el tema visual de EcoPlaza.",
  "settings.lightTheme": "Claro",
  "settings.darkTheme": "Oscuro",
  "settings.selectedTheme": "Tema seleccionado",
  "settings.language": "Idioma de la interfaz",
  "settings.spanish": "Español",
  "settings.english": "English",
  "settings.weightUnit": "Unidad de peso",
  "settings.kilograms": "Kilogramos (kg)",
  "settings.demoContainer": "Contenedor de demostración",
  "settings.demoDescription":
    "Define la categoría que representará el contenedor físico.",
  "settings.assignedCategory": "Categoría asignada",
  "settings.demoHelp": "Configuración del contenedor.",
  "settings.showDemoData": "Mostrar datos demostrativos",
  "settings.showDemoDataDescription": "Muestra u oculta datos demostrativos.",
  "settings.resetPreferences": "Restablecer preferencias",
  "settings.resetPreferencesDescription":
    "Restaura la configuración predeterminada.",
};

const englishTranslations: Record<string, string> = {
  ...translations,
  "settings.systemInfoTitle": "System & Environment Information",
  "settings.systemInfoDescription":
    "Execution runtime diagnostics and platform capabilities.",
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
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

describe("SystemInfoCard y diagnóstico de entorno en SettingsPage (Tarea 080)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = "es";
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("a) Renderizado correcto de la información del sistema en entorno web por defecto", () => {
    render(<SystemInfoCard />);

    // Región accesible identificada por su encabezado
    const region = screen.getByRole("region", {
      name: "Información del Sistema y Entorno",
    });
    expect(region).toBeDefined();

    // Versión 1.0.0 expuesta
    expect(screen.getByText("v1.0.0")).toBeDefined();
    expect(screen.getByText("Versión de la plataforma")).toBeDefined();

    // Modo Web
    expect(screen.getByText("Modo de ejecución")).toBeDefined();
    const webBadges = screen.getAllByText("Navegador Web");
    expect(webBadges.length).toBeGreaterThanOrEqual(1);

    // Diálogos en fallback web
    expect(screen.getByText("Gestor de archivos")).toBeDefined();
    expect(screen.getByText("Descargas directas del navegador")).toBeDefined();
  });

  test("b) Renderizado con textos correctos en español e inglés y modo escritorio", () => {
    // 1. Prueba en inglés
    currentLang = "en";
    const { unmount } = render(<SystemInfoCard />);

    expect(
      screen.getByRole("region", { name: "System & Environment Information" }),
    ).toBeDefined();
    expect(screen.getByText("Platform version")).toBeDefined();
    expect(screen.getByText("Execution mode")).toBeDefined();
    expect(screen.getByText("File manager")).toBeDefined();
    expect(screen.getByText("Direct browser downloads")).toBeDefined();
    expect(screen.getAllByText("Web Browser").length).toBeGreaterThanOrEqual(1);
    unmount();

    // 2. Simulación de entorno de escritorio Tauri 2
    currentLang = "es";
    vi.spyOn(tauriService, "getAppPlatformInfo").mockReturnValue({
      isDesktop: true,
      platform: "windows",
      version: "1.0.0",
    });
    vi.spyOn(tauriService, "isNativeDialogSupported").mockReturnValue(true);

    render(<SystemInfoCard />);

    expect(
      screen.getByRole("region", { name: "Información del Sistema y Entorno" }),
    ).toBeDefined();
    const desktopBadges = screen.getAllByText("Escritorio Nativo (Tauri 2)");
    expect(desktopBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Diálogos nativos del sistema")).toBeDefined();
  });

  test("c) Integración correcta y visibilidad dentro de SettingsPage", () => {
    render(
      <ThemeProvider>
        <DemoVisibilityProvider>
          <SettingsPage />
        </DemoVisibilityProvider>
      </ThemeProvider>,
    );

    // Encabezado de página
    expect(screen.getByText("Configuración")).toBeDefined();

    // Panel de preferencias generales
    expect(screen.getByText("Preferencias generales")).toBeDefined();

    // Tarjeta de información del sistema integrada en la página
    const systemRegion = screen.getByRole("region", {
      name: "Información del Sistema y Entorno",
    });
    expect(systemRegion).toBeDefined();
    expect(screen.getByText("v1.0.0")).toBeDefined();
    expect(screen.getAllByText("Navegador Web").length).toBeGreaterThanOrEqual(1);
  });
});
