import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoSalesTable, { type DemoSale } from "../src/components/DemoSalesTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockDemoSales: DemoSale[] = [
  {
    id: "DEMO-SALE-001",
    buyer: "BioFertilizantes del Valle",
    material: "Orgánicos",
    quantity: 1250,
    total: 375000,
    date: "2026-10-24",
    status: "completed",
  },
  {
    id: "DEMO-SALE-002",
    buyer: "EcoPlásticos del Norte",
    material: "Reciclables",
    quantity: 800,
    total: 960000,
    date: "2026-10-25",
    status: "completed",
  },
];

afterEach(() => {
  cleanup();
});

describe("DemoSalesTable Component - Tabla de Ventas en Modo Demostración y Accesibilidad", () => {
  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna (scope='col'), caption y data-testid", () => {
    render(<DemoSalesTable sales={mockDemoSales} testId="custom-demo-sales-table" />);

    const table = screen.getByRole("table");
    expect(table).toBeTruthy();

    const container = screen.getByTestId("custom-demo-sales-table");
    expect(container).toBeTruthy();

    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(7);
    expect(screen.getByRole("columnheader", { name: "sales.sale" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "buyers.buyer" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "common.material" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "common.quantity" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "sales.total" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "common.date" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "common.status" })).toBeTruthy();
  });

  it("2. Renderiza de forma accesible las filas de ventas demo con identificador, comprador, material y fecha", () => {
    render(<DemoSalesTable sales={mockDemoSales} />);

    expect(screen.getByText("DEMO-SALE-001")).toBeTruthy();
    expect(screen.getByText("BioFertilizantes del Valle")).toBeTruthy();
    expect(screen.getByText("2026-10-24")).toBeTruthy();

    expect(screen.getByText("DEMO-SALE-002")).toBeTruthy();
    expect(screen.getByText("EcoPlásticos del Norte")).toBeTruthy();
    expect(screen.getByText("2026-10-25")).toBeTruthy();
  });

  it("3. Provee un contenedor con role='region', aria-label descriptivo y soporte para foco por teclado en scroll horizontal", () => {
    render(<DemoSalesTable sales={mockDemoSales} />);

    const region = screen.getByRole("region", { name: "sales.demoTitle" });
    expect(region).toBeTruthy();
    expect(region.getAttribute("tabIndex")).toBe("0");
    expect(region.getAttribute("data-testid")).toBe("demo-sales-table");
  });

  it("4. Formatea correctamente los valores financieros en COP, cantidades en kg y traduce categorías y estados", () => {
    render(<DemoSalesTable sales={mockDemoSales} />);

    // Pesos con sufijo kg
    expect(screen.getByText("1250 common.kg")).toBeTruthy();
    expect(screen.getByText("800 common.kg")).toBeTruthy();

    // Categorías traducidas
    expect(screen.getByText("common.organic")).toBeTruthy();
    expect(screen.getByText("common.recyclable")).toBeTruthy();

    // Totales formateados
    expect(screen.getByText(/375/)).toBeTruthy();
    expect(screen.getByText(/960/)).toBeTruthy();

    // Badges de estado completado
    const completedBadges = screen.getAllByText("common.completed");
    expect(completedBadges).toHaveLength(2);
  });

  it("5. Renderiza estado vacío accesible con role='status' y mensaje explicativo cuando la lista de ventas está vacía", () => {
    render(<DemoSalesTable sales={[]} />);

    const emptyCell = screen.getByRole("status");
    expect(emptyCell).toBeTruthy();
    expect(screen.getByText("sales.noSales")).toBeTruthy();
    expect(screen.queryByText("DEMO-SALE-001")).toBeNull();
  });

  it("6. Mantiene la inmutabilidad de la colección de ventas sin mutar los datos originales", () => {
    const originalSales: DemoSale[] = [
      {
        id: "DEMO-SALE-IMMUTABLE",
        buyer: "Recicladora Central",
        material: "Reciclables",
        quantity: 500,
        total: 250000,
        date: "2026-10-26",
        status: "completed",
      },
    ];

    const copyBefore = JSON.parse(JSON.stringify(originalSales));

    const { rerender } = render(<DemoSalesTable sales={originalSales} />);

    expect(screen.getByText("DEMO-SALE-IMMUTABLE")).toBeTruthy();
    expect(originalSales).toEqual(copyBefore);

    rerender(<DemoSalesTable sales={[]} />);
    expect(originalSales).toEqual(copyBefore);
  });
});

