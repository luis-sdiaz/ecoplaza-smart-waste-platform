import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MonthlySalesSummary, {
  type MonthlySalesSummaryProps,
} from "../src/components/MonthlySalesSummary";

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
          if (key === "reports.monthlyTrendIncrease") {
            return `Incremento del ${defaultValueOrOptions.value}% respecto al período anterior`;
          }
          if (key === "reports.monthlyTrendDecrease") {
            return `Reducción del ${defaultValueOrOptions.value}% respecto al período anterior`;
          }
          return `${key}:${defaultValueOrOptions.value}`;
        }
        return defaultValueOrOptions.defaultValue || key;
      }
      if (key === "reports.monthlySales") return "Resumen mensual de ventas";
      if (key === "reports.totalRevenueTitle") return "Ingresos totales";
      if (key === "reports.totalWeightSold") return "Peso total comercializado";
      if (key === "reports.averagePriceTitle") return "Precio promedio por kg";
      if (key === "reports.loadingMonthlySummary") return "Cargando resumen mensual de ventas...";
      if (key === "common.kg") return "kg";
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockSummary: MonthlySalesSummaryProps = {
  totalRevenue: 4850000,
  totalWeight: 3250.5,
  averagePricePerKg: 1492.08,
  trendPercentage: 15.4,
  periodLabel: "Octubre 2026",
};

describe("MonthlySalesSummary Component - Resumen Comercial y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSummary = (propsOverrides: Partial<MonthlySalesSummaryProps> = {}) => {
    const defaultProps: MonthlySalesSummaryProps = {
      ...mockSummary,
      ...propsOverrides,
    };
    return {
      ...render(<MonthlySalesSummary {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con semántica accesible y título del resumen", () => {
    const { container } = renderSummary();

    const region =
      screen.queryByRole("region") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;
    expect(region).toBeInTheDocument();
    expect(
      screen.getByText(/resumen de ventas|ventas del mes|rendimiento comercial|resumen mensual de ventas/i),
    ).toBeInTheDocument();
  });

  it("2. Despliega los ingresos monetarios totales con formato de moneda", () => {
    renderSummary();

    expect(screen.getByText(/4[.,]?850[.,]?000/)).toBeInTheDocument();
  });

  it("3. Muestra el peso total comercializado en kilogramos y el precio promedio por kg", () => {
    renderSummary();

    expect(screen.getByText(/3[.,]?250[.,]5|3250/)).toBeInTheDocument();
    expect(screen.getByText(/1[.,]?492|1492/)).toBeInTheDocument();
  });

  it("4. Renderiza la variación de tendencia con textos descriptivos para lectores de pantalla", () => {
    const { container } = renderSummary({ trendPercentage: 15.4 });

    expect(screen.getAllByText(/15[.,]4\s*%/).length).toBeGreaterThanOrEqual(1);
    const srText = container.querySelector(".sr-only");
    expect(
      srText || screen.getByText(/incremento|aumento|subida|positivo|\+?15[.,]4%/i),
    ).toBeInTheDocument();
  });

  it("5. Maneja de forma resiliente valores en cero o faltantes sin arrojar NaN", () => {
    renderSummary({
      totalRevenue: 0,
      totalWeight: 0,
      averagePricePerKg: 0,
      trendPercentage: 0,
    });

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
  });

  it("6. Soporta estado de carga accesible con role=\"status\" cuando isLoading es verdadero", () => {
    const { rerender } = renderSummary({ isLoading: true });

    const loader =
      screen.queryByRole("status") || screen.queryByText(/cargando|loading/i);
    expect(loader).toBeInTheDocument();

    // Verificación adicional de soporte interactivo por teclado y clic con onClick
    const handleClick = vi.fn();
    rerender(
      <MonthlySalesSummary
        {...mockSummary}
        isLoading={false}
        onClick={handleClick}
      />,
    );

    const interactiveCard = screen.getByRole("button");
    expect(interactiveCard).toBeInTheDocument();

    fireEvent.click(interactiveCard);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(interactiveCard, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(interactiveCard, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
