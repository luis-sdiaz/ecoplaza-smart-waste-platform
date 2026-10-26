import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WasteRecordTable, { type WasteRecord } from "../src/components/WasteRecordTable";

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
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

const mockRecords: WasteRecord[] = [
  {
    id: "rec-001",
    category: "organic",
    containerCode: "CONT-ORG-01",
    containerId: "cont-01",
    weightKg: 42.5,
    weight: 42.5,
    createdAt: "2026-10-22T09:15:00Z",
    notes: "Residuos orgánicos de cafetería central",
  },
  {
    id: "rec-002",
    category: "recyclable",
    containerCode: "CONT-REC-02",
    containerId: "cont-02",
    weightKg: 18.75,
    weight: 18.75,
    createdAt: "2026-10-22T11:40:00Z",
    notes: "Cartón y plástico limpio de empaque",
  },
  {
    id: "rec-003",
    category: "nonRecyclable",
    containerCode: "CONT-NON-03",
    containerId: "cont-03",
    weightKg: 8.2,
    weight: 8.2,
    createdAt: "2026-10-22T14:05:00Z",
    notes: "Barrido y materiales mixtos no aprovechables",
  },
];

describe("WasteRecordTable Component - Historial Tabular de Residuos y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (propsOverrides = {}) => {
    const defaultProps = {
      records: mockRecords,
      ...propsOverrides,
    };
    return {
      ...render(<WasteRecordTable {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna", () => {
    const { container } = renderTable();

    const table = screen.queryByRole("table") || container.querySelector("table");
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(3);
  });

  it("2. Despliega un estado vacío (Empty State) informativo cuando la lista de registros está vacía", () => {
    renderTable({ records: [] });

    expect(
      screen.getByText(/sin registros|no hay registros|no se encontraron|vacío/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra correctamente los códigos de contenedor asociados a cada registro", () => {
    renderTable();

    expect(screen.getByText(/CONT-ORG-01/i)).toBeInTheDocument();
    expect(screen.getByText(/CONT-REC-02/i)).toBeInTheDocument();
    expect(screen.getByText(/CONT-NON-03/i)).toBeInTheDocument();
  });

  it("4. Renderiza las categorías de material con sus respectivos badges o textos legibles", () => {
    renderTable();

    expect(screen.getAllByText(/orgánico|organic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reciclable|recyclable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no reciclable|non.?recyclable/i).length).toBeGreaterThan(0);
  });

  it("5. Despliega los valores de peso cuantitativo formateados con su unidad en kilogramos", () => {
    renderTable();

    expect(screen.getByText(/42[.,]5/)).toBeInTheDocument();
    expect(screen.getByText(/18[.,]75/)).toBeInTheDocument();
    expect(screen.getByText(/8[.,]2/)).toBeInTheDocument();
  });

  it("6. Despliega el número exacto de filas correspondientes a los registros proporcionados", () => {
    renderTable();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(mockRecords.length + 1);
  });
});

