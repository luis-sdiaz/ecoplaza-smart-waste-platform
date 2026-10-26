import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContainerStockSummaryTable, {
  type ContainerStockSummaryTableProps,
} from "../src/components/ContainerStockSummaryTable";
import type { ContainerStockSummary } from "../src/services/coreWorkflow";

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
      const translations: Record<string, string> = {
        "inventory.container": "Contenedor",
        "inventory.availableWeight": "Peso disponible",
        "inventory.availableRecords": "Registros disponibles",
        "inventory.stockStatus": "Estado de existencias",
        "inventory.withStock": "Con existencias",
        "inventory.withoutStock": "Sin existencias",
        "inventory.noRegisteredContainers": "No hay contenedores reales registrados para resumir.",
        "inventory.stockSummaryTitle": "Resumen de existencias por contenedor",
        "inventory.stockByContainer": "Existencias por contenedor",
        "inventory.stockSummaryTableCaption": "Resumen de existencias y peso disponible por contenedor",
        "inventory.loadingStockSummary": "Cargando resumen de existencias por contenedor...",
        "common.kg": "kg",
      };
      return translations[key] ?? key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockSummaries: readonly ContainerStockSummary[] = [
  {
    containerId: "cnt-01",
    containerCode: "CTR-001",
    availableWeightKg: 1450.5,
    availableRecordCount: 8,
  },
  {
    containerId: "cnt-02",
    containerCode: "CTR-002",
    availableWeightKg: 0,
    availableRecordCount: 0,
  },
  {
    containerId: "cnt-03",
    containerCode: "CTR-003",
    availableWeightKg: 890.25,
    availableRecordCount: 4,
  },
];

describe("ContainerStockSummaryTable Component - Resumen de Stock por Contenedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    propsOverrides: Partial<ContainerStockSummaryTableProps> = {},
  ) => {
    const defaultProps: ContainerStockSummaryTableProps = {
      summaries: mockSummaries,
      ...propsOverrides,
    };
    return {
      ...render(<ContainerStockSummaryTable {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con semántica accesible (role='region'), tabla y encabezados con scope='col'", () => {
    const { container } = renderComponent();

    const region =
      screen.queryByRole("region") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;
    expect(region).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.length).toBe(4);
    expect(screen.getByText("Contenedor")).toBeInTheDocument();
    expect(screen.getByText("Peso disponible")).toBeInTheDocument();
    expect(screen.getByText("Registros disponibles")).toBeInTheDocument();
    expect(screen.getByText("Estado de existencias")).toBeInTheDocument();

    const caption = container.querySelector("caption");
    expect(caption).toBeInTheDocument();
    expect(caption?.textContent).toContain("Resumen de existencias");
  });

  it("2. Despliega los códigos de contenedor y formatea los pesos disponibles con su unidad (kg)", () => {
    renderComponent();

    expect(screen.getByText("CTR-001")).toBeInTheDocument();
    expect(screen.getByText("CTR-002")).toBeInTheDocument();
    expect(screen.getByText("CTR-003")).toBeInTheDocument();

    expect(screen.getByText(/1[.,]?450[.,]?5\s*kg/i)).toBeInTheDocument();
    expect(screen.getByText(/0\s*kg/i)).toBeInTheDocument();
    expect(screen.getByText(/890[.,]?25\s*kg/i)).toBeInTheDocument();
  });

  it("3. Renderiza badges de estado de existencias (con stock vs sin stock) correctamente", () => {
    renderComponent();

    const inStockBadges = screen.getAllByText("Con existencias");
    expect(inStockBadges.length).toBe(2);

    const outOfStockBadges = screen.getAllByText("Sin existencias");
    expect(outOfStockBadges.length).toBe(1);
  });

  it("4. Despliega la cantidad de registros disponibles por cada contenedor", () => {
    renderComponent();

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("5. Maneja adecuadamente el estado vacío cuando no hay contenedores registrados", () => {
    renderComponent({ summaries: [] });

    expect(
      screen.getByText(/no hay contenedores reales registrados para resumir/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("6. Soporta estado de carga accesible con role='status' y aria-live='polite' cuando isLoading es verdadero", () => {
    renderComponent({ isLoading: true });

    const statusLoader = screen.getByRole("status");
    expect(statusLoader).toBeInTheDocument();
    expect(
      screen.getByText(/cargando resumen de existencias por contenedor/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

