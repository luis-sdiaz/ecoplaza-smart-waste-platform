import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WasteSummaryCard, { type WasteSummaryCardProps } from "../src/components/WasteSummaryCard";

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

const mockSummary = {
  totalWeight: 1450.5,
  organicWeight: 750.2,
  recyclableWeight: 520.3,
  nonRecyclableWeight: 180.0,
  trendPercentage: 12.5,
  periodLabel: "Últimos 30 días",
};

describe("WasteSummaryCard Component - Resumen de Residuos y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCard = (propsOverrides: Partial<WasteSummaryCardProps> = {}) => {
    const defaultProps: WasteSummaryCardProps = {
      ...mockSummary,
      ...propsOverrides,
    };
    return {
      ...render(<WasteSummaryCard {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor del card con título semántico accesible", () => {
    renderCard();

    expect(
      screen.getByText(/resumen de residuos|total de residuos|residuos gestionados/i),
    ).toBeInTheDocument();
  });

  it("2. Despliega la métrica cuantitativa principal de peso total en kilogramos", () => {
    renderCard();

    expect(screen.getByText(/1[.,]?450[.,]5|1450/)).toBeInTheDocument();
  });

  it("3. Muestra el desglose por categorías (orgánico, reciclable, no reciclable)", () => {
    renderCard();

    expect(screen.getAllByText(/orgánico|organic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reciclable|recyclable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no reciclable|non.?recyclable|aprovechable/i).length).toBeGreaterThan(0);
  });

  it("4. Renderiza los valores individuales de peso por cada categoría", () => {
    renderCard();

    expect(screen.getByText(/750[.,]2|750/)).toBeInTheDocument();
    expect(screen.getByText(/520[.,]3|520/)).toBeInTheDocument();
    expect(screen.getByText(/180/)).toBeInTheDocument();
  });

  it("5. Despliega la variación porcentual y tendencia con descripción legible", () => {
    renderCard({ trendPercentage: 12.5 });

    expect(screen.getByText(/12[.,]5\s*%/)).toBeInTheDocument();
  });

  it("6. Maneja de forma resiliente valores en cero sin generar NaN ni errores en DOM", () => {
    renderCard({
      totalWeight: 0,
      organicWeight: 0,
      recyclableWeight: 0,
      nonRecyclableWeight: 0,
      trendPercentage: 0,
    });

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
  });
});

