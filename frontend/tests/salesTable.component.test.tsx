import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SalesTable, { type SalesTableProps } from "../src/components/SalesTable";
import type { SaleHistoryItem } from "../src/services/salesService";

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

const mockSales: SaleHistoryItem[] = [
  {
    id: "sale-001-abcdef12",
    buyerId: "buyer-01",
    buyerName: "Recuperadora del Cauca",
    wasteRecordId: "rec-001",
    wasteRecordNumber: "1",
    category: "recyclable",
    weightKg: 150.5,
    unitPrice: 1200,
    totalValue: 180600,
    soldAt: "2026-10-22T10:30:00Z",
    notes: "Plástico PET limpio y compactado",
  },
  {
    id: "sale-002-fedcba34",
    buyerId: "buyer-02",
    buyerName: "Abonos Orgánicos del Valle",
    wasteRecordId: "rec-002",
    wasteRecordNumber: "12",
    category: "organic",
    weightKg: 320,
    unitPrice: 450,
    totalValue: 144000,
    soldAt: "2026-10-23T14:15:00Z",
    notes: "Compost orgánico húmedo",
  },
  {
    id: "sale-003-56789abc",
    buyerId: "buyer-03",
    buyerName: "Gestión Ambiental Urbana",
    wasteRecordId: "rec-003",
    wasteRecordNumber: "105",
    category: "nonRecyclable",
    weightKg: 85.25,
    unitPrice: 150,
    totalValue: 12787.5,
    soldAt: "2026-10-24T16:45:00Z",
    notes: "Material de rechazo procesado",
  },
];

describe("SalesTable Component - Tabla Operativa de Ventas y Accesibilidad", () => {
  const onViewDetailsMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (propsOverrides: Partial<SalesTableProps> = {}) => {
    const defaultProps: SalesTableProps = {
      sales: mockSales,
      onViewDetails: onViewDetailsMock,
      ...propsOverrides,
    };
    return {
      ...render(<SalesTable {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna", () => {
    const { container } = renderTable();

    const table = screen.queryByRole("table") || container.querySelector("table");
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(6);
    headers.forEach((header) => {
      expect(header.getAttribute("scope")).toBe("col");
    });
  });

  it("2. Despliega un estado vacío (Empty State) informativo cuando la lista de ventas está vacía", () => {
    renderTable({ sales: [] });

    expect(
      screen.getByText(/sin ventas|no hay ventas|no se encontraron|vacío/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra correctamente los códigos formateados de venta y los nombres de los compradores", () => {
    renderTable();

    expect(screen.getByText(/SAL-SALE-001/i)).toBeInTheDocument();
    expect(screen.getByText(/SAL-SALE-002/i)).toBeInTheDocument();
    expect(screen.getByText(/SAL-SALE-003/i)).toBeInTheDocument();

    expect(screen.getByText("Recuperadora del Cauca")).toBeInTheDocument();
    expect(screen.getByText("Abonos Orgánicos del Valle")).toBeInTheDocument();
    expect(screen.getByText("Gestión Ambiental Urbana")).toBeInTheDocument();
  });

  it("4. Renderiza las categorías de material con sus respectivos badges y lotes vinculados", () => {
    renderTable();

    expect(screen.getAllByText(/reciclable|recyclable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/orgánico|organic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no reciclable|non.?recyclable/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/RES-001/i)).toBeInTheDocument();
    expect(screen.getByText(/RES-012/i)).toBeInTheDocument();
    expect(screen.getByText(/RES-105/i)).toBeInTheDocument();
  });

  it("5. Despliega los valores cuantitativos de peso y montos monetarios en COP correctamente formateados", () => {
    renderTable();

    expect(screen.getByText(/150[.,]5/)).toBeInTheDocument();
    expect(screen.getByText(/320/)).toBeInTheDocument();
    expect(screen.getByText(/85[.,]25/)).toBeInTheDocument();

    expect(screen.getByText(/180[.,\s\u00a0]600/)).toBeInTheDocument();
    expect(screen.getByText(/144[.,\s\u00a0]000/)).toBeInTheDocument();
  });

  it("6. Dispara el callback onViewDetails con los datos exactos de la venta al interactuar con el botón de detalle", () => {
    renderTable();

    const detailButtons = screen.getAllByRole("button", { name: /detalle/i });
    expect(detailButtons.length).toBe(mockSales.length);

    fireEvent.click(detailButtons[0]);
    expect(onViewDetailsMock).toHaveBeenCalledTimes(1);
    expect(onViewDetailsMock).toHaveBeenCalledWith(mockSales[0]);
  });
});
