import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerTable, { type BuyerTableProps } from "../src/components/BuyerTable";
import type { Buyer } from "../src/services/buyerService";

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

const mockBuyers = [
  {
    id: "buy-001",
    name: "Recuperadora Bolívar S.A.S.",
    phone: "3101234567",
    email: "contacto@bolivar.com",
    status: "active",
  },
  {
    id: "buy-002",
    name: "EcoMetales del Norte",
    phone: "3009876543",
    email: "compras@ecometales.com",
    status: "active",
  },
  {
    id: "buy-003",
    name: "BioAbonos de Colombia",
    phone: "3154443322",
    email: "planta@bioabonos.co",
    status: "inactive",
  },
];

describe("BuyerTable Component - Directorio Tabular de Compradores y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (propsOverrides: Partial<BuyerTableProps> = {}) => {
    const defaultProps: BuyerTableProps = {
      buyers: mockBuyers as unknown as Buyer[],
      onEdit: vi.fn(),
      onViewHistory: vi.fn(),
      ...propsOverrides,
    };
    return {
      ...render(<BuyerTable {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna", () => {
    const { container } = renderTable();

    const table = screen.queryByRole("table") || container.querySelector("table");
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(4);
    headers.forEach((header) => {
      expect(header.getAttribute("scope")).toBe("col");
    });
  });

  it("2. Despliega un estado vacío (Empty State) informativo cuando la lista de compradores está vacía", () => {
    renderTable({ buyers: [] });

    expect(
      screen.getByText(/sin compradores|no hay compradores|no se encontraron|vacío/i),
    ).toBeInTheDocument();
  });

  it("3. Muestra nombres y contactos sin presentar columnas no persistidas", () => {
    renderTable();

    expect(screen.getByText(/Recuperadora Bolívar S\.A\.S\./i)).toBeInTheDocument();
    expect(screen.getByText(/contacto@bolivar\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/3101234567/i)).toBeInTheDocument();

    expect(screen.getByText(/EcoMetales del Norte/i)).toBeInTheDocument();
    expect(screen.getByText(/BioAbonos de Colombia/i)).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /documento|nit/i })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /dirección|address/i })).toBeNull();
  });

  it("4. Renderiza los badges o indicadores de estado para compradores activos e inactivos", () => {
    renderTable();

    expect(screen.getAllByText(/activo|active/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/inactivo|inactive/i).length).toBeGreaterThanOrEqual(1);
  });

  it("5. Invoca el callback onEdit con el comprador exacto al pulsar el botón de edición", () => {
    const { props } = renderTable();

    const editButtons =
      screen.queryAllByRole("button", { name: /editar|edit/i }) ||
      screen.queryAllByLabelText(/editar/i);

    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "buy-001" }),
    );
  });

  it("6. Invoca el callback de historial de compras al hacer clic en el botón de historial", () => {
    const { props } = renderTable();

    const historyButtons =
      screen.queryAllByRole("button", { name: /historial|compras|purchases|ver/i }) ||
      screen.queryAllByLabelText(/historial|compras/i);

    expect(historyButtons.length).toBeGreaterThan(0);
    fireEvent.click(historyButtons[0]);

    const historyCallback = props.onViewHistory || props.onViewPurchases;
    expect(historyCallback).toHaveBeenCalledTimes(1);
    expect(historyCallback).toHaveBeenCalledWith(
      expect.objectContaining({ id: "buy-001" }),
    );
  });

  it("7. Apila Historial y Editar con separación y dimensiones idénticas", () => {
    renderTable();

    const historyButton = screen.getAllByRole("button", { name: /historial/i })[0];
    const editButton = screen.getAllByRole("button", { name: /editar/i })[0];
    const actions = historyButton.parentElement;

    expect(actions?.className).toContain("flex-col");
    expect(actions?.className).toContain("gap-2");
    for (const button of [historyButton, editButton]) {
      expect(button.className).toContain("h-9");
      expect(button.className).toContain("w-24");
      expect(button.className).toContain("justify-center");
    }
  });

  it("8. Mantiene visibles compradores históricos sin información de contacto", () => {
    renderTable({
      buyers: [
        {
          id: "legacy-buyer",
          name: "Comprador histórico",
          email: null,
          phone: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(screen.getByText("Comprador histórico")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

