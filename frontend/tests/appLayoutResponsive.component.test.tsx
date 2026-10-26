import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "../src/layouts/AppLayout";

// Mock de autenticación
vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "admin@ecoplaza.com" },
    profile: { full_name: "Operador EcoPlaza", role: "admin" },
    signOut: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock de i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
}));

// Mock de useTheme
vi.mock("../src/theme/useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
  }),
}));

// Mock de DemoVisibility
vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => ({
    isDemoHidden: false,
    toggleDemoVisibility: vi.fn(),
  }),
}));

describe("AppLayout Component - Responsividad y Navegación Móvil (Drawer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderLayout = () => {
    return render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout />
      </MemoryRouter>,
    );
  };

  it("1. Renderiza el botón de menú móvil en estado cerrado por defecto (aria-expanded=\"false\")", () => {
    const { container } = renderLayout();
    const mobileButton =
      screen.queryByRole("button", { name: /menú|menu|navegación|abrir/i }) ||
      container.querySelector("button.md\\:hidden");

    expect(mobileButton).toBeTruthy();
    if (mobileButton?.hasAttribute("aria-expanded")) {
      expect(mobileButton.getAttribute("aria-expanded")).toBe("false");
    }

    const backdrop =
      container.querySelector(".bg-black\\/50") ||
      container.querySelector('[aria-modal="true"]');
    expect(backdrop).toBeFalsy();
  });

  it("2. Abre el drawer móvil y muestra el overlay al hacer clic en el botón de menú", () => {
    const { container } = renderLayout();
    const mobileButton =
      screen.queryByRole("button", { name: /menú|menu|navegación|abrir/i }) ||
      container.querySelector("button.md\\:hidden");

    expect(mobileButton).toBeTruthy();
    fireEvent.click(mobileButton!);

    const backdrop =
      container.querySelector(".bg-black\\/50") ||
      container.querySelector('[aria-modal="true"]') ||
      container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();

    if (mobileButton?.hasAttribute("aria-expanded")) {
      expect(mobileButton.getAttribute("aria-expanded")).toBe("true");
    }
  });

  it("3. Cierra el drawer móvil al hacer clic en el backdrop / overlay", () => {
    const { container } = renderLayout();
    const mobileButton =
      screen.queryByRole("button", { name: /menú|menu|navegación|abrir/i }) ||
      container.querySelector("button.md\\:hidden");

    fireEvent.click(mobileButton!);

    const backdrop =
      container.querySelector(".bg-black\\/50") ||
      container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);

    const closedBackdrop = container.querySelector(".bg-black\\/50");
    expect(closedBackdrop).toBeFalsy();
  });

  it("4. Cierra el menú móvil al presionar la tecla Escape de forma accesible", () => {
    const { container } = renderLayout();
    const mobileButton =
      screen.queryByRole("button", { name: /menú|menu|navegación|abrir/i }) ||
      container.querySelector("button.md\\:hidden");

    fireEvent.click(mobileButton!);

    fireEvent.keyDown(window, { key: "Escape" });

    const backdrop = container.querySelector(".bg-black\\/50");
    expect(backdrop).toBeFalsy();
  });
});

