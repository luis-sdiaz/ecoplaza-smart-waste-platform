import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WasteDistributionChart, {
  type WasteDistributionChartProps,
} from "../src/components/WasteDistributionChart";

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

// Mock de ResizeObserver si la librería gráfica lo requiere
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockDistributionData = [
  { category: "organic", weight: 450, percentage: 45 },
  { category: "recyclable", weight: 350, percentage: 35 },
  { category: "nonRecyclable", weight: 200, percentage: 20 },
];

describe("WasteDistributionChart Component - Gráfico de Distribución y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderChart = (propsOverrides: Partial<WasteDistributionChartProps> = {}) => {
    const defaultProps: WasteDistributionChartProps = {
      data: mockDistributionData,
      organicWeight: 450,
      recyclableWeight: 350,
      nonRecyclableWeight: 200,
      ...propsOverrides,
    };
    return {
      ...render(<WasteDistributionChart {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor del gráfico con atributos semánticos accesibles", () => {
    const { container } = renderChart();

    const chartRegion =
      screen.queryByRole("region") ||
      screen.queryByRole("img") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;

    expect(chartRegion).toBeInTheDocument();
  });

  it("2. Despliega un estado vacío informativo cuando no hay datos o los pesos son cero", () => {
    renderChart({
      data: [],
      organicWeight: 0,
      recyclableWeight: 0,
      nonRecyclableWeight: 0,
    });

    expect(
      screen.getByText(/sin datos|no hay datos|no se registran|vacío/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra la leyenda de categorías de material (orgánico, reciclable, no reciclable)", () => {
    renderChart();

    expect(screen.getAllByText(/orgánico|organic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reciclable|recyclable/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/no reciclable|non.?recyclable|no aprovechable/i).length,
    ).toBeGreaterThan(0);
  });

  it("4. Renderiza los valores cuantitativos de peso o porcentajes correspondientes a cada material", () => {
    renderChart();

    expect(screen.getAllByText(/450|45\s*%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/350|35\s*%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/200|20\s*%/).length).toBeGreaterThan(0);
  });

  it("5. Proporciona una representación textual accesible para tecnologías asistivas (sr-only)", () => {
    const { container } = renderChart();

    const accessibleContent =
      container.querySelector(".sr-only") ||
      screen.queryByRole("list", { hidden: true }) ||
      screen.queryByLabelText(/distribución|resumen/i);

    expect(accessibleContent).toBeInTheDocument();
  });

  it("6. Muestra un estado de carga accesible cuando la propiedad isLoading es verdadera", () => {
    renderChart({ isLoading: true });

    const loader =
      screen.queryByRole("status") || screen.queryByText(/cargando|loading/i);
    expect(loader).toBeInTheDocument();
  });
});

