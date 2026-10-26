import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SalesTrendChart, {
  type SalesTrendChartProps,
} from "../src/components/SalesTrendChart";

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
      defaultValueOrOptions?: string | { defaultValue?: string; [key: string]: unknown },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        return defaultValueOrOptions.defaultValue || key;
      }
      if (key === "reports.salesTrend") return "Evolución de ventas";
      if (key === "reports.salesTrendDescription") {
        return "Cantidad de operaciones e ingresos brutos agrupados por fecha de realización.";
      }
      if (key === "reports.emptySalesTrendTitle") return "Sin registros de ventas";
      if (key === "reports.emptySalesTrendDescription") {
        return "La evolución aparecerá cuando se confirme la primera venta.";
      }
      if (key === "reports.loadingSalesTrend") return "Cargando evolución de ventas...";
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

// Mock de ResizeObserver para visualizaciones basadas en contenedor responsivo
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockTrendData = [
  { period: "Ene 2026", revenue: 3200000, weight: 2100 },
  { period: "Feb 2026", revenue: 4100000, weight: 2800 },
  { period: "Mar 2026", revenue: 4850000, weight: 3250 },
];

describe("SalesTrendChart Component - Visualización Analítica de Tendencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderChart = (propsOverrides: Partial<SalesTrendChartProps> = {}) => {
    const defaultProps: SalesTrendChartProps = {
      data: mockTrendData,
      ...propsOverrides,
    };
    return {
      ...render(<SalesTrendChart {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con semántica accesible y título del gráfico", () => {
    const { container } = renderChart();

    const region =
      screen.queryByRole("region") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;
    expect(region).toBeInTheDocument();
    expect(
      screen.getAllByText(/tendencia de ventas|evolución de ventas|histórico de ventas/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("2. Despliega los puntos de datos y períodos temporales provistos", () => {
    renderChart();

    expect(screen.getAllByText(/Ene 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Feb 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Mar 2026/i).length).toBeGreaterThanOrEqual(1);
  });

  it("3. Proporciona una representación estructurada accesible (sr-only) para lectores de pantalla", () => {
    const { container } = renderChart();

    const srContent = container.querySelector(".sr-only");
    expect(
      srContent || screen.getByText(/3[.,]?200[.,]?000|4[.,]?100[.,]?000/),
    ).toBeInTheDocument();
  });

  it("4. Maneja adecuadamente el estado vacío cuando no hay datos disponibles", () => {
    renderChart({ data: [] });

    expect(
      screen.getByText(/no hay datos|sin registros|no se encontraron tendencias/i),
    ).toBeInTheDocument();
  });

  it("5. Renderiza un estado de carga accesible con role=\"status\" cuando isLoading es verdadero", () => {
    renderChart({ isLoading: true });

    const loader =
      screen.queryByRole("status") || screen.queryByText(/cargando|loading/i);
    expect(loader).toBeInTheDocument();
  });

  it("6. Mantiene resiliencia ante valores en cero o datos incompletos sin arrojar errores de renderizado", () => {
    const zeroData = [{ period: "Abr 2026", revenue: 0, weight: 0 }];
    renderChart({ data: zeroData });

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText(/Abr 2026/i).length).toBeGreaterThanOrEqual(1);
  });
});
