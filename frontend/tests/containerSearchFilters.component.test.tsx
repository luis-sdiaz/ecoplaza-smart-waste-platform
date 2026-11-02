import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ContainersPage from "../src/pages/ContainersPage";
import type { Container } from "../src/services/containerService";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  listAvailableWasteRecords: vi.fn(),
  createContainer: vi.fn(),
  saveContainerCsv: vi.fn(),
  saveContainerExcel: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "es" },
  }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  createContainer: mocks.createContainer,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: mocks.listAvailableWasteRecords,
}));

vi.mock("../src/services/containerCsv", () => ({
  saveContainerCsv: mocks.saveContainerCsv,
}));

vi.mock("../src/services/containerExcelService", () => ({
  saveContainerExcel: mocks.saveContainerExcel,
}));

type MockFilterContainer = Container & {
  category?: string;
  wasteType?: string;
  location?: string;
  currentWeightKg?: number;
};

const mockContainers: MockFilterContainer[] = [
  {
    id: "cont-1",
    code: "CONT-001",
    category: "Orgánicos",
    wasteType: "Compost",
    location: "Bodega Norte",
    currentWeightKg: 50.5,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cont-2",
    code: "CONT-002",
    category: "Reciclables",
    wasteType: "Plástico",
    location: "Patio Central",
    currentWeightKg: 0,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "cont-3",
    code: "CONT-003",
    category: "No aprovechables",
    wasteType: "Ordinarios",
    location: "Bodega Sur",
    currentWeightKg: 15.2,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "cont-4",
    code: "CONT-004",
    category: "Orgánicos",
    wasteType: "Restos vegetales",
    location: "Invernadero",
    currentWeightKg: 0,
    createdAt: "2026-01-04T00:00:00.000Z",
  },
];

afterEach(cleanup);

beforeEach(() => {
  mocks.listContainers.mockResolvedValue({
    ok: true,
    data: mockContainers.map((c) => ({ id: c.id, code: c.code, createdAt: c.createdAt })),
  });
  mocks.listAvailableWasteRecords.mockResolvedValue({ ok: true, data: [] });
  mocks.createContainer.mockResolvedValue({ ok: true, data: {} });
  mocks.saveContainerCsv.mockResolvedValue("saved");
  mocks.saveContainerExcel.mockResolvedValue("saved");
});

describe("ContainersPage search and stock filters", () => {
  test("renders search input and stock filter controls properly", () => {
    render(<ContainersPage initialContainers={mockContainers} />);

    expect(screen.getByLabelText("containers.searchLabel")).toBeTruthy();
    expect(screen.getByPlaceholderText("containers.searchPlaceholder")).toBeTruthy();

    const stockSelect = screen.getByLabelText("containers.stockFilterLabel") as HTMLSelectElement;
    expect(stockSelect).toBeTruthy();
    expect(stockSelect.value).toBe("all");

    // Valida que todos los contenedores se rendericen inicialmente
    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.getByText("CONT-002")).toBeTruthy();
    expect(screen.getByText("CONT-003")).toBeTruthy();
    expect(screen.getByText("CONT-004")).toBeTruthy();
  });

  test("filters dynamically by stock availability (with_stock and empty)", () => {
    render(<ContainersPage initialContainers={mockContainers} />);

    const stockSelect = screen.getByLabelText("containers.stockFilterLabel");

    // Filtrar con stock
    fireEvent.change(stockSelect, { target: { value: "with_stock" } });
    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.getByText("CONT-003")).toBeTruthy();
    expect(screen.queryByText("CONT-002")).toBeNull();
    expect(screen.queryByText("CONT-004")).toBeNull();

    // Filtrar vacíos / sin stock
    fireEvent.change(stockSelect, { target: { value: "empty" } });
    expect(screen.getByText("CONT-002")).toBeTruthy();
    expect(screen.getByText("CONT-004")).toBeTruthy();
    expect(screen.queryByText("CONT-001")).toBeNull();
    expect(screen.queryByText("CONT-003")).toBeNull();

    // Volver a todos
    fireEvent.change(stockSelect, { target: { value: "all" } });
    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.getByText("CONT-002")).toBeTruthy();
    expect(screen.getByText("CONT-003")).toBeTruthy();
    expect(screen.getByText("CONT-004")).toBeTruthy();
  });

  test("filters dynamically by text search", () => {
    render(<ContainersPage initialContainers={mockContainers} />);

    const searchInput = screen.getByPlaceholderText("containers.searchPlaceholder");

    // Buscar por tipo de residuo
    fireEvent.change(searchInput, { target: { value: "Plástico" } });
    expect(screen.getByText("CONT-002")).toBeTruthy();
    expect(screen.queryByText("CONT-001")).toBeNull();
    expect(screen.queryByText("CONT-003")).toBeNull();
    expect(screen.queryByText("CONT-004")).toBeNull();

    // Limpiar búsqueda
    const clearButton = screen.getByLabelText("containers.clearSearch");
    fireEvent.click(clearButton);
    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.getByText("CONT-002")).toBeTruthy();
    expect(screen.getByText("CONT-003")).toBeTruthy();
    expect(screen.getByText("CONT-004")).toBeTruthy();
  });

  test("combines text search with stock availability filter", () => {
    render(<ContainersPage initialContainers={mockContainers} />);

    const searchInput = screen.getByPlaceholderText("containers.searchPlaceholder");
    const stockSelect = screen.getByLabelText("containers.stockFilterLabel");

    // Buscar "Orgánicos" y filtrar por "with_stock" -> solo CONT-001 (CONT-004 es vacío)
    fireEvent.change(searchInput, { target: { value: "Orgánicos" } });
    fireEvent.change(stockSelect, { target: { value: "with_stock" } });

    expect(screen.getByText("CONT-001")).toBeTruthy();
    expect(screen.queryByText("CONT-004")).toBeNull();
    expect(screen.queryByText("CONT-002")).toBeNull();
    expect(screen.queryByText("CONT-003")).toBeNull();

    // Cambiar a "empty" manteniendo la búsqueda de "Orgánicos" -> solo CONT-004
    fireEvent.change(stockSelect, { target: { value: "empty" } });
    expect(screen.getByText("CONT-004")).toBeTruthy();
    expect(screen.queryByText("CONT-001")).toBeNull();

    // Búsqueda sin coincidencias muestra mensaje vacío
    fireEvent.change(searchInput, { target: { value: "NO-EXISTE-XYZ" } });
    expect(
      screen.queryByText("containers.noSearchResultsTitle") ||
        screen.getByText("containers.noFilteredResultsTitle"),
    ).toBeTruthy();
  });
});
