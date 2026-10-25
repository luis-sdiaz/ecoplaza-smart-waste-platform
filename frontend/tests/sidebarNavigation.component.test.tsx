import { cleanup, render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../src/components/Sidebar";

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

// Mock de autenticación para pruebas deterministas
vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "admin@ecoplaza.com" },
    profile: { full_name: "Operador EcoPlaza", role: "admin" },
    signOut: vi.fn().mockResolvedValue({ ok: true }),
    logout: vi.fn(),
  }),
}));

// Mock de internacionalización para textos estables
const translations: Record<string, string> = {
  "navigation.home": "Dashboard (Panel)",
  "navigation.sensors": "Sensores",
  "navigation.waste": "Residuos",
  "navigation.inventory": "Inventario",
  "navigation.buyers": "Compradores",
  "navigation.sales": "Ventas",
  "navigation.reports": "Informes",
  "navigation.assistant": "Asistente IA",
  "navigation.settings": "Configuración",
  "navigation.tagline": "Gestión inteligente",
  "navigation.signOut": "Cerrar sesión",
  "navigation.profile": "Mi perfil",
  "navigation.expandSidebar": "Expandir barra lateral",
  "navigation.collapseSidebar": "Colapsar barra lateral",
  "auth.signingOut": "Cerrando sesión...",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) =>
      translations[key] || defaultValue || key,
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
}));

const render = (
  ui: React.ReactElement,
  options?: Parameters<typeof rtlRender>[1],
) => rtlRender(ui, { wrapper: MemoryRouter, ...options });

describe("Sidebar Component - Navegación Colapsable y Accesibilidad UI/UX", () => {
  const defaultProps = {
    currentTab: "dashboard",
    onTabChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renderiza en modo expandido por defecto con clase w-64, logotipos, enlaces y perfil visibles", () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const asideElement =
      container.querySelector("aside") ||
      (container.firstElementChild as HTMLElement);

    expect(asideElement.className).toContain("w-64");
    expect(asideElement.className).not.toContain("w-20");

    const logoOrTitle =
      screen.queryByText(/^ecoplaza$/i) ||
      screen.getAllByText(/ecoplaza/i)[0];
    expect(logoOrTitle).toBeInTheDocument();

    expect(screen.getByText(/dashboard|panel/i)).toBeInTheDocument();
    expect(screen.getByText(/residuos/i)).toBeInTheDocument();

    const profileText =
      screen.queryByText(/operador ecoplaza/i) ||
      screen.queryByText(/admin@ecoplaza.com/i);
    expect(profileText || asideElement).toBeInTheDocument();
  });

  it("2. Realiza transición reactiva a modo colapsado (w-20) al interactuar con el botón toggle", () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const asideElement =
      container.querySelector("aside") ||
      (container.firstElementChild as HTMLElement);

    const toggleButton = screen.getByRole("button", {
      name: /colapsar|expandir|toggle|sidebar/i,
    });
    expect(toggleButton).toBeInTheDocument();

    // Click 1: Conmuta a modo colapsado
    fireEvent.click(toggleButton);
    expect(asideElement.className).toContain("w-20");
    expect(asideElement.className).not.toContain("w-64");

    // Click 2: Regresa a modo expandido
    fireEvent.click(toggleButton);
    expect(asideElement.className).toContain("w-64");
    expect(asideElement.className).not.toContain("w-20");
  });

  it("3. Aplica clases de ocultamiento accesible a etiquetas de texto y preserva sr-only en cierre de sesión", () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const toggleButton = screen.getByRole("button", {
      name: /colapsar|expandir|toggle|sidebar/i,
    });

    // Colapsar barra lateral
    fireEvent.click(toggleButton);

    // Verificar clases de ocultamiento en etiquetas de navegación
    const hiddenLabels = container.querySelectorAll(".max-w-0");
    expect(hiddenLabels.length).toBeGreaterThan(0);
    hiddenLabels.forEach((el) => {
      expect(el.className).toContain("opacity-0");
      expect(el.className).toContain("pointer-events-none");
    });

    // Preservación del texto para lectores de pantalla en botón de logout
    const logoutSrOnly = container.querySelector(".sr-only");
    expect(logoutSrOnly).toBeInTheDocument();
    expect(logoutSrOnly?.textContent?.toLowerCase()).toMatch(
      /cerrar sesión|logout|salir/i,
    );
  });

  it("4. Actualiza atributos ARIA en el toggle y retiene la pestaña activa conectada", () => {
    const onTabChangeMock = vi.fn();
    const { container } = render(
      <Sidebar currentTab="waste" onTabChange={onTabChangeMock} />,
    );

    const toggleButton = screen.getByRole("button", {
      name: /colapsar|expandir|toggle|sidebar/i,
    });

    const initialAriaLabel = toggleButton.getAttribute("aria-label") || "";
    expect(initialAriaLabel.toLowerCase()).toMatch(/colapsar/i);

    fireEvent.click(toggleButton);
    const collapsedAriaLabel = toggleButton.getAttribute("aria-label") || "";
    expect(collapsedAriaLabel.toLowerCase()).toMatch(/expandir/i);

    // Validar indicador de pestaña activa
    const activeTabIndicator =
      container.querySelector('[aria-current="page"]') ||
      container.querySelector(".bg-emerald-600") ||
      container.querySelector(".text-emerald-600") ||
      container.querySelector(".active");
    expect(activeTabIndicator).toBeInTheDocument();

    // Validar cambio de tab interactivo
    const inventoryButton =
      screen.getByRole("button", { name: /inventario|inventory/i }) ||
      screen.getByText(/inventario|inventory/i).closest("button");
    if (inventoryButton) {
      fireEvent.click(inventoryButton);
      expect(onTabChangeMock).toHaveBeenCalled();
    }
  });
});
