import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoBuyerTable, { type DemoBuyer } from "../src/components/DemoBuyerTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockDemoBuyers: DemoBuyer[] = [
  {
    id: "DEMO-001",
    name: "BioFertilizantes del Valle",
    type: "Productor de compost",
    interest: "Orgánicos",
    contact: "contacto@biofertilizantes.com",
    status: "Activo",
  },
  {
    id: "DEMO-002",
    name: "EcoPlásticos del Norte",
    type: "Empresa recicladora",
    interest: "Reciclables",
    contact: "+57 310 987 6543",
    status: "Interesado",
  },
  {
    id: "DEMO-003",
    name: "Comercializadora Verde",
    type: "Comerciante",
    interest: "Orgánicos",
    contact: "ventas@verde.co",
    status: "Activo",
  },
  {
    id: "DEMO-004",
    name: "Asociación de Recicladores Unidos",
    type: "Asociación",
    interest: "Reciclables",
    contact: "asociacion@recicladores.org",
    status: "Interesado",
  },
];

afterEach(() => {
  cleanup();
});

describe("DemoBuyerTable Component - Directorio de Compradores Demo y Accesibilidad", () => {
  it("1. Renderiza la estructura semántica de tabla accesible con encabezados de columna (scope='col') y data-testid", () => {
    render(<DemoBuyerTable buyers={mockDemoBuyers} testId="custom-demo-buyer-table" />);

    const table = screen.getByRole("table");
    expect(table).toBeTruthy();

    const container = screen.getByTestId("custom-demo-buyer-table");
    expect(container).toBeTruthy();

    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(6);
    expect(screen.getByRole("columnheader", { name: "buyers.code" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "buyers.buyer" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "buyers.type" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "buyers.interest" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "buyers.contact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "common.status" })).toBeTruthy();
  });

  it("2. Renderiza de forma accesible las filas de compradores demo con identificador, nombre y datos de contacto", () => {
    render(<DemoBuyerTable buyers={mockDemoBuyers} />);

    expect(screen.getByText("DEMO-001")).toBeTruthy();
    expect(screen.getByText("BioFertilizantes del Valle")).toBeTruthy();
    expect(screen.getByText("contacto@biofertilizantes.com")).toBeTruthy();

    expect(screen.getByText("DEMO-002")).toBeTruthy();
    expect(screen.getByText("EcoPlásticos del Norte")).toBeTruthy();
    expect(screen.getByText("+57 310 987 6543")).toBeTruthy();
  });

  it("3. Provee un contenedor con role='region', aria-label accesible y soporte para foco por teclado en scroll horizontal", () => {
    render(<DemoBuyerTable buyers={mockDemoBuyers} />);

    const region = screen.getByRole("region", { name: "buyers.demoTitle" });
    expect(region).toBeTruthy();
    expect(region.getAttribute("tabIndex")).toBe("0");
    expect(region.getAttribute("data-testid")).toBe("demo-buyer-table");
  });

  it("4. Traduce y renderiza correctamente los badges de estado, tipo de comprador y categoría de interés", () => {
    render(<DemoBuyerTable buyers={mockDemoBuyers} />);

    // Tipos traducidos
    expect(screen.getByText("buyers.compostProducer")).toBeTruthy();
    expect(screen.getByText("buyers.recyclerCompany")).toBeTruthy();
    expect(screen.getByText("buyers.merchant")).toBeTruthy();
    expect(screen.getByText("buyers.association")).toBeTruthy();

    // Categorías traducidas
    const organicBadges = screen.getAllByText("common.organic");
    expect(organicBadges.length).toBe(2);

    const recyclableBadges = screen.getAllByText("common.recyclable");
    expect(recyclableBadges.length).toBe(2);

    // Estados
    const activeBadges = screen.getAllByText("common.active");
    expect(activeBadges.length).toBe(2);

    const interestedBadges = screen.getAllByText("common.interested");
    expect(interestedBadges.length).toBe(2);
  });

  it("5. Renderiza estado vacío accesible con role='status' y mensaje explicativo cuando la colección está vacía", () => {
    render(<DemoBuyerTable buyers={[]} />);

    const emptyCell = screen.getByRole("status");
    expect(emptyCell).toBeTruthy();
    expect(screen.getByText("buyers.noBuyers")).toBeTruthy();

    // No se renderizan filas de compradores
    expect(screen.queryByText("DEMO-001")).toBeNull();
  });

  it("6. Mantiene la inmutabilidad de la colección de compradores sin mutar las referencias suministradas", () => {
    const originalBuyers: DemoBuyer[] = [
      {
        id: "DEMO-IMMUTABLE-1",
        name: "EcoBio S.A.S.",
        type: "Empresa recicladora",
        interest: "Reciclables",
        contact: "info@ecobio.co",
        status: "Activo",
      },
    ];

    const copyBefore = JSON.parse(JSON.stringify(originalBuyers));

    const { rerender } = render(<DemoBuyerTable buyers={originalBuyers} />);

    expect(screen.getByText("DEMO-IMMUTABLE-1")).toBeTruthy();
    expect(originalBuyers).toEqual(copyBefore);

    // Re-render con colección vacía
    rerender(<DemoBuyerTable buyers={[]} />);
    expect(originalBuyers).toEqual(copyBefore);
  });
});

