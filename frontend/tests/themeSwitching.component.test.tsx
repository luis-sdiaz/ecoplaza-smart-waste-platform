import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AppLayout from "../src/layouts/AppLayout";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { useTheme } from "../src/theme/useTheme";
import { THEME_STORAGE_KEY } from "../src/theme/ThemeContext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../src/components/Sidebar", () => ({
  default: () => <nav data-testid="app-sidebar">Mocked Sidebar</nav>,
}));

function ThemeControllerTest() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button
        type="button"
        data-testid="set-dark-btn"
        onClick={() => setTheme("dark")}
      >
        Set Dark
      </button>
      <button
        type="button"
        data-testid="set-light-btn"
        onClick={() => setTheme("light")}
      >
        Set Light
      </button>
      <button
        type="button"
        data-testid="toggle-theme-btn"
        onClick={toggleTheme}
      >
        Toggle Theme
      </button>
    </div>
  );
}

describe("Sincronización y persistencia inmediata del tema (Tarea 091 / Corrección Fondo Claro)", () => {
  beforeEach(() => {
    window.localStorage?.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    if (document.body) {
      document.body.className = "";
    }
  });

  afterEach(() => {
    cleanup();
    window.localStorage?.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    if (document.body) {
      document.body.className = "";
    }
  });

  test("a) El cambio de tema de 'dark' a 'light' remueve la clase 'dark' de document.documentElement y document.body de forma inmediata", () => {
    render(
      <ThemeProvider>
        <AppLayout>
          <ThemeControllerTest />
        </AppLayout>
      </ThemeProvider>,
    );

    // 1. Activar tema oscuro
    fireEvent.click(screen.getByTestId("set-dark-btn"));

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    // 2. Cambiar inmediatamente a tema claro
    fireEvent.click(screen.getByTestId("set-light-btn"));

    // Verificación sincrónica e inmediata en document.documentElement y body
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.body.classList.contains("dark")).toBe(false);
    expect(document.body.classList.contains("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  test("b) AppLayout y <main> reflejan las clases de fondo claro sin requerir recarga ni re-montaje", () => {
    const { container } = render(
      <ThemeProvider>
        <AppLayout>
          <ThemeControllerTest />
        </AppLayout>
      </ThemeProvider>,
    );

    const layoutDiv = container.querySelector(".ecoplaza-app-layout") as HTMLElement;
    const mainElement = container.querySelector("main.ecoplaza-app-main") as HTMLElement;
    const contentWrapper = mainElement.parentElement as HTMLElement;

    expect(layoutDiv).toBeTruthy();
    expect(mainElement).toBeTruthy();
    expect(contentWrapper).toBeTruthy();

    // Inicia en tema claro por defecto
    expect(layoutDiv.getAttribute("data-theme")).toBe("light");
    expect(layoutDiv.className).toContain("bg-slate-50");
    expect(layoutDiv.className).toContain("text-slate-900");
    expect(mainElement.className).toContain("bg-slate-50");
    expect(contentWrapper.className).toContain("bg-slate-50");

    // Cambiar a dark
    fireEvent.click(screen.getByTestId("set-dark-btn"));

    // Debe reflejar inmediatamente sin desmontar componentes
    expect(layoutDiv.getAttribute("data-theme")).toBe("dark");
    expect(layoutDiv.className).toContain("dark:bg-[#0b130e]");
    expect(mainElement.className).toContain("dark:bg-[#0b130e]");
    expect(contentWrapper.className).toContain("dark:bg-[#0b130e]");

    // Cambiar nuevamente a light
    fireEvent.click(screen.getByTestId("set-light-btn"));

    // Debe volver a reflejar data-theme="light" de inmediato
    expect(layoutDiv.getAttribute("data-theme")).toBe("light");
    expect(layoutDiv.className).toContain("bg-slate-50");
    expect(mainElement.className).toContain("bg-slate-50");
  });

  test("c) toggleTheme alterna sincrónicamente el estado y los atributos del DOM", () => {
    render(
      <ThemeProvider>
        <AppLayout>
          <ThemeControllerTest />
        </AppLayout>
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByTestId("toggle-theme-btn");

    // Primera alternancia: pasa de light a dark
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // Segunda alternancia: pasa de dark a light de inmediato
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
