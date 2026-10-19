import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authState = vi.hoisted(() => ({
  current: {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Operator User",
      email: "operator@ecoplaza.com",
      avatarUrl: null,
    },
  },
}));

const inventoryMocks = vi.hoisted(() => ({
  listWaste: vi.fn(),
  listContainers: vi.fn(),
}));

const testContainers = [
  { id: "c-1", code: "CONT-01", registeredAt: "2026-10-01T10:00:00.000Z" },
  { id: "c-2", code: "CONT-02", registeredAt: "2026-10-01T10:00:00.000Z" },
];

const testWasteRecords = [
  {
    id: "w-1",
    recordNumber: "1",
    containerId: "c-1",
    category: "organic" as const,
    weightKg: 10,
    registeredAt: "2026-10-10T12:00:00.000Z",
    status: "available" as const,
  },
  {
    id: "w-2",
    recordNumber: "2",
    containerId: "c-1",
    category: "recyclable" as const,
    weightKg: 25,
    registeredAt: "2026-10-11T12:00:00.000Z",
    status: "available" as const,
  },
  {
    id: "w-3",
    recordNumber: "3",
    containerId: "c-2",
    category: "organic" as const,
    weightKg: 50,
    registeredAt: "2026-10-12T12:00:00.000Z",
    status: "available" as const,
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.count !== undefined) return `${key}:${options.count}`;
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: inventoryMocks.listContainers,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: inventoryMocks.listWaste,
  calculateWasteStatistics: (records: Array<{
    category: "organic" | "recyclable" | "nonRecyclable";
    weightKg: number;
  }>) => ({
    recordCount: records.length,
    totalWeightKg: records.reduce((sum, r) => sum + r.weightKg, 0),
    organicWeightKg: records.filter((r) => r.category === "organic").reduce((sum, r) => sum + r.weightKg, 0),
    recyclableWeightKg: records.filter((r) => r.category === "recyclable").reduce((sum, r) => sum + r.weightKg, 0),
    nonRecyclableWeightKg: 0,
    organicPercentage: 0,
    recyclablePercentage: 0,
    nonRecyclablePercentage: 0,
  }),
}));

vi.mock("../src/services/inventoryExcelService", () => ({
  saveInventoryExcel: vi.fn(),
}));

import InventoryPage from "../src/pages/InventoryPage";

afterEach(cleanup);

beforeEach(() => {
  inventoryMocks.listWaste.mockReset();
  inventoryMocks.listContainers.mockReset();
  inventoryMocks.listContainers.mockResolvedValue({ ok: true, data: testContainers });
  inventoryMocks.listWaste.mockResolvedValue({ ok: true, data: testWasteRecords });
});

describe("InventoryPage weight range filter", () => {
  test("toggles advanced filters progressive disclosure panel", async () => {
    render(<InventoryPage />);

    expect(await screen.findByText("RES-001")).toBeTruthy();

    const advancedButton = screen.getByRole("button", { name: /advanced|avanzados/i });
    expect(advancedButton).toBeTruthy();
    expect(advancedButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("inventory.minWeight")).toBeNull();

    fireEvent.click(advancedButton);
    expect(advancedButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("inventory.minWeight")).toBeTruthy();

    fireEvent.click(advancedButton);
    expect(advancedButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("inventory.minWeight")).toBeNull();
  });

  test("renders minimum and maximum weight inputs properly", async () => {
    render(<InventoryPage />);

    expect(await screen.findByText("RES-001")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /advanced|avanzados/i }));

    const minInput = screen.getByLabelText("inventory.minWeight") as HTMLInputElement;
    const maxInput = screen.getByLabelText("inventory.maxWeight") as HTMLInputElement;

    expect(minInput).toBeTruthy();
    expect(maxInput).toBeTruthy();
    expect(minInput.value).toBe("");
    expect(maxInput.value).toBe("");
    expect(minInput.type).toBe("number");
    expect(maxInput.type).toBe("number");
  });

  test("filters the inventory reactively when typing minimum or maximum weight", async () => {
    render(<InventoryPage />);

    expect(await screen.findByText("RES-001")).toBeTruthy();
    expect(screen.getByText("RES-002")).toBeTruthy();
    expect(screen.getByText("RES-003")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /advanced|avanzados/i }));

    const minInput = screen.getByLabelText("inventory.minWeight");
    const maxInput = screen.getByLabelText("inventory.maxWeight");

    // Filter minimum weight >= 20 (should keep 25kg RES-002 and 50kg RES-003)
    fireEvent.change(minInput, { target: { value: "20" } });

    expect(screen.queryByText("RES-001")).toBeNull();
    expect(screen.getByText("RES-002")).toBeTruthy();
    expect(screen.getByText("RES-003")).toBeTruthy();

    // Filter maximum weight <= 30 (should only keep 25kg RES-002)
    fireEvent.change(maxInput, { target: { value: "30" } });

    expect(screen.queryByText("RES-001")).toBeNull();
    expect(screen.getByText("RES-002")).toBeTruthy();
    expect(screen.queryByText("RES-003")).toBeNull();
  });

  test("resets weight inputs and restores table when clicking Clear filters", async () => {
    render(<InventoryPage />);

    expect(await screen.findByText("RES-001")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /advanced|avanzados/i }));

    const minInput = screen.getByLabelText("inventory.minWeight") as HTMLInputElement;
    const maxInput = screen.getByLabelText("inventory.maxWeight") as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: "20" } });
    fireEvent.change(maxInput, { target: { value: "30" } });

    expect(minInput.value).toBe("20");
    expect(maxInput.value).toBe("30");
    expect(screen.queryByText("RES-001")).toBeNull();
    expect(screen.getByText("RES-002")).toBeTruthy();

    const clearButton = screen.getByRole("button", { name: "inventory.clearFilters" });
    fireEvent.click(clearButton);

    expect(minInput.value).toBe("");
    expect(maxInput.value).toBe("");

    expect(screen.getByText("RES-001")).toBeTruthy();
    expect(screen.getByText("RES-002")).toBeTruthy();
    expect(screen.getByText("RES-003")).toBeTruthy();
  });

  test("shows invalid weight range warning and filtered empty state on inverted range", async () => {
    render(<InventoryPage />);

    expect(await screen.findByText("RES-001")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /advanced|avanzados/i }));

    const minInput = screen.getByLabelText("inventory.minWeight");
    const maxInput = screen.getByLabelText("inventory.maxWeight");

    fireEvent.change(minInput, { target: { value: "50" } });
    fireEvent.change(maxInput, { target: { value: "10" } });

    expect(screen.getByRole("alert").textContent).toContain("inventory.invalidWeightRange");
    expect(screen.getByText("inventory.emptyFilteredTitle")).toBeTruthy();
    expect(screen.queryByText("RES-001")).toBeNull();
    expect(screen.queryByText("RES-002")).toBeNull();
    expect(screen.queryByText("RES-003")).toBeNull();
  });
});

