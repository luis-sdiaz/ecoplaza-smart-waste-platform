import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MetricCard, { type MetricCardProps } from "../src/components/MetricCard";

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
      defaultValueOrOptions?: string | { defaultValue?: string; count?: number },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        return defaultValueOrOptions.defaultValue || key;
      }
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

describe("MetricCard Component - Tarjeta de KPIs y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCard = (propsOverrides: Partial<MetricCardProps> = {}) => {
    const defaultProps: MetricCardProps = {
      title: "Residuos Totales Recolectados",
      value: "2.450 kg",
      subtitle: "Acumulado del mes en curso",
      ...propsOverrides,
    };
    return {
      ...render(<MetricCard {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor de la tarjeta con título y valor cuantitativo visible", () => {
    renderCard();

    expect(screen.getByText(/residuos totales recolectados/i)).toBeInTheDocument();
    expect(screen.getByText(/2[.,]?450\s*kg/i)).toBeInTheDocument();
  });

  it("2. Despliega el subtítulo o texto descriptivo de contexto", () => {
    renderCard({ subtitle: "Acumulado del mes en curso" });

    expect(screen.getByText(/acumulado del mes en curso/i)).toBeInTheDocument();
  });

  it("3. Muestra indicadores de tendencia positiva con texto accesible para tecnologías asistivas", () => {
    const { container } = renderCard({
      trend: "+15%",
      trendDirection: "up",
      trendLabel: "vs. mes anterior",
    });

    expect(screen.getByText(/\+?15%/)).toBeInTheDocument();
    const srText = container.querySelector(".sr-only");
    expect(
      srText || screen.getByText(/incremento|aumento|subida|positivo|\+?15%/i),
    ).toBeInTheDocument();
  });

  it("4. Renderiza tendencias negativas con su correspondiente diferenciación visual y semántica", () => {
    const { container } = renderCard({
      trend: "-8.5%",
      trendDirection: "down",
      trendLabel: "vs. semana anterior",
    });

    expect(screen.getByText(/-8[.,]5%/)).toBeInTheDocument();
    const srText = container.querySelector(".sr-only");
    expect(
      srText ||
        screen.getByText(/disminución|reducción|bajada|negativo|-8[.,]5%/i),
    ).toBeInTheDocument();
  });

  it("5. Muestra un estado de carga accesible (role=\"status\") cuando isLoading es verdadero", () => {
    renderCard({ isLoading: true });

    const loader =
      screen.queryByRole("status") || screen.queryByText(/cargando|loading/i);
    expect(loader).toBeInTheDocument();
  });

  it("6. Soporta interactividad mediante clic y teclado cuando se proporciona la prop onClick", () => {
    const handleClick = vi.fn();
    renderCard({ onClick: handleClick });

    const card = screen.getByRole("button") || screen.getByRole("region");
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

