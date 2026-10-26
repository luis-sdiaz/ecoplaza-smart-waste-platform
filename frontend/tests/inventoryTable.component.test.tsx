import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InventoryTable, { type InventoryTableProps } from "../src/components/InventoryTable";

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

const mockInventoryItems = [
  {
    id: "inv-rec-01",
    category: "recyclable",
    categoryName: "Material Reciclable",
    weightKg: 1250.75,
    weight: 1250.75,
    percentage: 62.5,
    maxCapacityKg: 2000,
    updatedAt: "2026-10-24T11:00:00Z",
    status: "optimal",
  },
  {
    id: "inv-org-02",
    category: "organic",
    categoryName: "Residuos Orgánicos",
    weightKg: 850.0,
    weight: 850.0,
    percentage: 85.0,
    maxCapacityKg: 1000,
    updatedAt: "2026-10-24T12:30:00Z",
    status: "warning",
  },
  {
    id: "inv-non-03",
    category: "nonRecyclable",
    categoryName: "No Aprovechables",
    weightKg: 180.25,
    weight: 180.25,
    percentage: 36.0,
    maxCapacityKg: 500,
    updatedAt: "2026-10-24T09:15:00Z",
    status: "low",
  },
];

describe("InventoryTable Component - Stock de Bodega y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (propsOverrides: Partial<InventoryTableProps> = {}) => {
    const defaultProps: InventoryTableProps = {
      items: mockInventoryItems,
      ...propsOverrides,
    };
    return {
      ...render(<InventoryTable {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna", () => {
    const { container } = renderTable();

    const table = screen.queryByRole("table") || container.querySelector("table");
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(3);
    headers.forEach((header) => {
      expect(header.getAttribute("scope")).toBe("col");
    });
  });

  it("2. Despliega un estado vacío (Empty State) informativo cuando no hay existencias en inventario", () => {
    renderTable({ items: [] });

    expect(
      screen.getByText(/sin inventario|no hay inventario|no se encontraron|vacío|sin registros/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra correctamente las categorías de material con sus respectivos nombres y badges", () => {
    renderTable();

    expect(screen.getAllByText(/reciclable|recyclable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/orgánico|organic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no reciclable|non.?recyclable|no aprovechable/i).length).toBeGreaterThan(0);
  });

  it("4. Despliega los valores de peso cuantitativo en kilogramos (kg) con formato adecuado", () => {
    renderTable();

    expect(screen.getByText(/1[.,]?250[.,]75|1250/)).toBeInTheDocument();
    expect(screen.getByText(/850/)).toBeInTheDocument();
    expect(screen.getByText(/180[.,]25|180/)).toBeInTheDocument();
  });

  it("5. Renderiza adecuadamente el porcentaje de ocupación o capacidad de acopio", () => {
    renderTable();

    expect(screen.getByText(/62[.,]5\s*%|63\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/85\s*%/)).toBeInTheDocument();
  });

  it("6. Despliega el número exacto de filas correspondientes a los materiales en inventario", () => {
    renderTable();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(mockInventoryItems.length + 1);
  });
});
