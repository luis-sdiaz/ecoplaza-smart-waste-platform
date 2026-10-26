import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EnvironmentalImpactCard, {
  type EnvironmentalImpactCardProps,
} from "../src/components/EnvironmentalImpactCard";

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

afterEach(cleanup);

// Mocks de i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      defaultValueOrOptions?:
        | string
        | { defaultValue?: string; count?: number; value?: string | number },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        if ("value" in defaultValueOrOptions) {
          return `${key}:${defaultValueOrOptions.value}`;
        }
        return defaultValueOrOptions.defaultValue || key;
      }
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

describe("EnvironmentalImpactCard Component - Visualización de Equivalencias Ecológicas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCard = (propsOverrides: Partial<EnvironmentalImpactCardProps> = {}) => {
    const defaultProps: EnvironmentalImpactCardProps = {
      title: "Impacto Ambiental Positivo",
      subtitle: "Equivalencias ecológicas generadas por la valorización",
      co2SavedKg: 245.5,
      treesPreserved: 3.2,
      waterSavedLiters: 1250,
      energySavedKwh: 310.8,
      recyclingRatePercentage: 78.4,
      ...propsOverrides,
    };
    return {
      ...render(<EnvironmentalImpactCard {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con roles semánticos y título accesible", () => {
    renderCard({
      title: "Impacto Ecológico EcoPlaza",
      subtitle: "Balance ambiental del período",
    });

    const region =
      screen.getByRole("region", { name: /impacto ecológico ecoplaza/i }) ||
      screen.getByLabelText(/impacto ecológico ecoplaza/i);
    expect(region).toBeInTheDocument();
    expect(screen.getByText("Impacto Ecológico EcoPlaza")).toBeInTheDocument();
    expect(screen.getByText("Balance ambiental del período")).toBeInTheDocument();
  });

  it("2. Despliega las métricas cuantitativas y unidades de equivalencia ecológica", () => {
    renderCard({
      co2SavedKg: 180.5,
      treesPreserved: 4.5,
      waterSavedLiters: 2500,
      energySavedKwh: 420.2,
    });

    expect(screen.getAllByText(/180[.,]5/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4[.,]5/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2[.,]?500/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/420[.,]2/).length).toBeGreaterThanOrEqual(1);
  });

  it("3. Renderiza badges temáticos y la barra de progreso de tasa de reciclaje", () => {
    renderCard({
      badge: "Auditoría Verificada",
      badgeVariant: "real",
      recyclingRatePercentage: 85.5,
    });

    expect(screen.getByText("Auditoría Verificada")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("85.5");
    expect(progressBar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("4. Provee texto accesible oculto (sr-only) para tecnologías asistivas y lectores de pantalla", () => {
    const { container } = renderCard({
      co2SavedKg: 95.0,
      treesPreserved: 2.0,
      waterSavedLiters: 800,
      energySavedKwh: 150.0,
    });

    const srElements = container.querySelectorAll(".sr-only");
    expect(srElements.length).toBeGreaterThanOrEqual(4);

    const srTextCombined = Array.from(srElements)
      .map((el) => el.textContent)
      .join(" ");

    expect(srTextCombined).toMatch(/95/);
    expect(srTextCombined).toMatch(/2/);
    expect(srTextCombined).toMatch(/800/);
    expect(srTextCombined).toMatch(/150/);
  });

  it("5. Presenta resiliencia matemática total ante valores nulos, indefinidos o en cero sin arrojar NaN", () => {
    const { container } = renderCard({
      co2SavedKg: null,
      treesPreserved: undefined,
      waterSavedLiters: null,
      energySavedKwh: undefined,
      recyclingRatePercentage: null,
      totalRecycledKg: null,
    });

    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("undefined");

    // Debe renderizar 0 en las métricas en vez de romper
    expect(screen.getAllByText(/0/).length).toBeGreaterThanOrEqual(1);
  });

  it("6. Renderiza el estado de carga accesible (role=\"status\") ante isLoading e interactividad accesible con onClick", () => {
    const { rerender } = renderCard({ isLoading: true });

    const loader =
      screen.getByRole("status") || screen.getByText(/calculando|loading/i);
    expect(loader).toBeInTheDocument();

    // Ahora probamos la interactividad cuando isLoading es falso y hay onClick
    const handleClick = vi.fn();
    rerender(
      <EnvironmentalImpactCard
        title="Impacto Clickeable"
        isLoading={false}
        onClick={handleClick}
      />,
    );

    const interactiveCard = screen.getByRole("button", { name: /impacto clickeable/i });
    expect(interactiveCard).toBeInTheDocument();

    fireEvent.click(interactiveCard);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(interactiveCard, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(interactiveCard, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
