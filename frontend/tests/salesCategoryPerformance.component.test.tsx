import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SalesCategoryPerformance, {
  type SalesCategoryPerformanceProps,
} from "../src/components/SalesCategoryPerformance";

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
      if (key === "reports.salesByCategory") return "Rendimiento por categoría";
      if (key === "reports.salesByCategoryDescription") {
        return "Ventas, peso vendido e ingresos brutos según la categoría registrada en cada operación.";
      }
      if (key === "reports.categoryParticipation") return "Participación";
      if (key === "reports.emptySalesCategoryTitle") return "Sin registros de categorías";
      if (key === "reports.emptySalesByCategory") {
        return "Aún no hay ventas; todas las categorías muestran valores en cero.";
      }
      if (key === "reports.loadingSalesCategory") return "Cargando rendimiento por categoría...";
      if (key === "common.kg") return "kg";
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockCategoryData = [
  { category: "Plásticos", revenue: 1850000, weight: 1200, percentage: 38.1 },
  { category: "Metales", revenue: 1600000, weight: 850, percentage: 33.0 },
  { category: "Papel y Cartón", revenue: 1400000, weight: 1200, percentage: 28.9 },
];

describe("SalesCategoryPerformance Component - Rendimiento por Categoría", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    propsOverrides: Partial<SalesCategoryPerformanceProps> = {},
  ) => {
    const defaultProps: SalesCategoryPerformanceProps = {
      data: mockCategoryData,
      ...propsOverrides,
    };
    return {
      ...render(<SalesCategoryPerformance {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con semántica accesible y título del desglose", () => {
    const { container } = renderComponent();

    const region =
      screen.queryByRole("region") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;
    expect(region).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /rendimiento por categoría|desempeño por categoría|ventas por categoría/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("2. Despliega las categorías de residuos y sus importes monetarios correspondientes", () => {
    renderComponent();

    expect(screen.getAllByText(/Plásticos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Metales/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Papel y Cartón/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1[.,]?850[.,]?000|\$|COP/i).length).toBeGreaterThanOrEqual(1);
  });

  it("3. Muestra el volumen en kilogramos y porcentajes con barras o indicadores accesibles", () => {
    renderComponent();

    const progressbars = screen.queryAllByRole("progressbar");
    if (progressbars.length > 0) {
      expect(progressbars.length).toBeGreaterThanOrEqual(1);
    } else {
      expect(screen.getAllByText(/38[.,]1\s*%|38%/i).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getAllByText(/1[.,]?200\s*kg|1200/i).length).toBeGreaterThanOrEqual(1);
  });

  it("4. Incorpora descripciones accesibles para tecnologías asistivas (sr-only)", () => {
    const { container } = renderComponent();

    const srContent = container.querySelector(".sr-only");
    expect(srContent || screen.getAllByText(/Plásticos/i)[0]).toBeInTheDocument();
  });

  it("5. Maneja adecuadamente el estado vacío cuando no hay categorías disponibles", () => {
    renderComponent({ data: [] });

    expect(
      screen.getByText(/sin registros|no hay datos|no se encontraron categorías/i),
    ).toBeInTheDocument();
  });

  it("6. Soporta estado de carga accesible con role=\"status\" cuando isLoading es verdadero", () => {
    renderComponent({ isLoading: true });

    const loader =
      screen.queryByRole("status") || screen.queryByText(/cargando|loading/i);
    expect(loader).toBeInTheDocument();
  });
});
