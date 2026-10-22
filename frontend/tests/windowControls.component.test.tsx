import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import WindowControls from "../src/components/WindowControls";
import * as tauriService from "../src/services/tauriService";

const translations: Record<string, string> = {
  "windowControls.toolbarLabel": "Controles de ventana",
  "windowControls.minimize": "Minimizar",
  "windowControls.maximize": "Maximizar o restaurar",
  "windowControls.close": "Cerrar aplicación",
};

const englishTranslations: Record<string, string> = {
  "windowControls.toolbarLabel": "Window controls",
  "windowControls.minimize": "Minimize",
  "windowControls.maximize": "Maximize or restore",
  "windowControls.close": "Close application",
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

describe("WindowControls component y adaptabilidad de escritorio (Tarea 081)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = "es";
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    vi.restoreAllMocks();
  });

  test("a) en entorno web estándar (por defecto) no se renderizan los controles de ventana", () => {
    const { container } = render(<WindowControls />);
    expect(container.firstChild).toBeNull();
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  test("b) simula presencia de Tauri (__TAURI_INTERNALS__), verificando toolbar y 3 botones con ARIA en español e inglés", () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};

    // 1. Verificación en español
    currentLang = "es";
    const { unmount } = render(<WindowControls />);

    const toolbarEs = screen.getByRole("toolbar", {
      name: "Controles de ventana",
    });
    expect(toolbarEs).toBeDefined();

    expect(screen.getByRole("button", { name: "Minimizar" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Maximizar o restaurar" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Cerrar aplicación" }),
    ).toBeDefined();
    unmount();

    // 2. Verificación en inglés
    currentLang = "en";
    render(<WindowControls />);

    const toolbarEn = screen.getByRole("toolbar", { name: "Window controls" });
    expect(toolbarEn).toBeDefined();

    expect(screen.getByRole("button", { name: "Minimize" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Maximize or restore" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Close application" }),
    ).toBeDefined();
  });

  test("c) valida que al hacer clic en minimizar, maximizar y cerrar se invoquen las respectivas utilidades de tauriService", async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};

    const minimizeSpy = vi
      .spyOn(tauriService, "minimizeAppWindow")
      .mockResolvedValue(true);
    const maximizeSpy = vi
      .spyOn(tauriService, "toggleMaximizeAppWindow")
      .mockResolvedValue(true);
    const closeSpy = vi
      .spyOn(tauriService, "closeAppWindow")
      .mockResolvedValue(true);

    currentLang = "es";
    render(<WindowControls />);

    const minBtn = screen.getByRole("button", { name: "Minimizar" });
    const maxBtn = screen.getByRole("button", { name: "Maximizar o restaurar" });
    const closeBtn = screen.getByRole("button", { name: "Cerrar aplicación" });

    fireEvent.click(minBtn);
    expect(minimizeSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(maxBtn);
    expect(maximizeSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
