import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authState = vi.hoisted(() => ({ current: { user: null } as { user: TestUser | null } }));
const inventoryMocks = vi.hoisted(() => ({
  listWaste: vi.fn(),
  listContainers: vi.fn(),
  saveExcel: vi.fn(),
}));

type TestUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const userA: TestUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "User A",
  email: "a@example.com",
  avatarUrl: null,
};
const userB: TestUser = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "User B",
  email: "b@example.com",
  avatarUrl: null,
};

const wasteA = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  recordNumber: "1",
  containerId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  category: "organic" as const,
  weightKg: 10,
  registeredAt: "2026-10-01T12:00:00.000Z",
  status: "available" as const,
};
const wasteB = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  recordNumber: "2",
  containerId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  category: "recyclable" as const,
  weightKg: 20,
  registeredAt: "2026-10-02T12:00:00.000Z",
  status: "available" as const,
};
const containerA = {
  id: wasteA.containerId,
  code: "A-CONTAINER",
  registeredAt: "2026-10-01T10:00:00.000Z",
};
const containerB = {
  id: wasteB.containerId,
  code: "B-CONTAINER",
  registeredAt: "2026-10-02T10:00:00.000Z",
};

const success = <T,>(data: T) => ({ ok: true as const, data });

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
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
  calculateWasteStatistics: (records: typeof wasteA[]) => ({
    recordCount: records.length,
    totalWeightKg: records.reduce((sum, record) => sum + record.weightKg, 0),
    organicWeightKg: records.filter((record) => record.category === "organic")
      .reduce((sum, record) => sum + record.weightKg, 0),
    recyclableWeightKg: records.filter((record) => record.category === "recyclable")
      .reduce((sum, record) => sum + record.weightKg, 0),
    nonRecyclableWeightKg: 0,
    organicPercentage: 0,
    recyclablePercentage: 0,
    nonRecyclablePercentage: 0,
  }),
}));

vi.mock("../src/services/inventoryExcelService", () => ({
  saveInventoryExcel: inventoryMocks.saveExcel,
}));

import InventoryPage from "../src/pages/InventoryPage";

afterEach(cleanup);

beforeEach(() => {
  authState.current = { user: userA };
  inventoryMocks.listWaste.mockReset();
  inventoryMocks.listContainers.mockReset();
  inventoryMocks.saveExcel.mockReset();
  inventoryMocks.saveExcel.mockResolvedValue("cancelled");
});

describe("Inventory account isolation", () => {
  test("removes user A records immediately while user B data is loading", async () => {
    const pendingWasteB = deferred<ReturnType<typeof success<(typeof wasteB)[]>>>();
    const pendingContainersB = deferred<ReturnType<typeof success<(typeof containerB)[]>>>();
    inventoryMocks.listWaste
      .mockResolvedValueOnce(success([wasteA]))
      .mockReturnValueOnce(pendingWasteB.promise);
    inventoryMocks.listContainers
      .mockResolvedValueOnce(success([containerA]))
      .mockReturnValueOnce(pendingContainersB.promise);

    const view = render(<InventoryPage />);
    expect(await screen.findByText("RES-001")).toBeTruthy();

    authState.current = { user: userB };
    view.rerender(<InventoryPage />);

    expect(screen.queryByText("RES-001")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("inventory.loading");

    await act(async () => {
      pendingWasteB.resolve(success([wasteB]));
      pendingContainersB.resolve(success([containerB]));
      await pendingWasteB.promise;
    });

    expect(await screen.findByText("RES-002")).toBeTruthy();
    expect(screen.queryByText("RES-001")).toBeNull();
  });

  test("ignores a delayed response from user A after user B has rendered", async () => {
    const pendingWasteA = deferred<ReturnType<typeof success<(typeof wasteA)[]>>>();
    const pendingContainersA = deferred<ReturnType<typeof success<(typeof containerA)[]>>>();
    inventoryMocks.listWaste
      .mockReturnValueOnce(pendingWasteA.promise)
      .mockResolvedValueOnce(success([wasteB]));
    inventoryMocks.listContainers
      .mockReturnValueOnce(pendingContainersA.promise)
      .mockResolvedValueOnce(success([containerB]));

    const view = render(<InventoryPage />);
    authState.current = { user: userB };
    view.rerender(<InventoryPage />);

    expect(await screen.findByText("RES-002")).toBeTruthy();

    await act(async () => {
      pendingWasteA.resolve(success([wasteA]));
      pendingContainersA.resolve(success([containerA]));
      await pendingWasteA.promise;
    });

    expect(screen.getByText("RES-002")).toBeTruthy();
    expect(screen.queryByText("RES-001")).toBeNull();
  });

  test("renders no private inventory after the authenticated session disappears", async () => {
    inventoryMocks.listWaste.mockResolvedValueOnce(success([wasteA]));
    inventoryMocks.listContainers.mockResolvedValueOnce(success([containerA]));

    const view = render(<InventoryPage />);
    expect(await screen.findByText("RES-001")).toBeTruthy();

    authState.current = { user: null };
    view.rerender(<InventoryPage />);

    expect(view.container.childElementCount).toBe(0);
  });

  test("exports only inventory matching every active filter in the selected order", async () => {
    const now = new Date();
    const registeredDaysAgo = (days: number): string =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 12).toISOString();
    const organicHeavy = { ...wasteA, registeredAt: registeredDaysAgo(10), weightKg: 10 };
    const organicLight = {
      ...wasteA,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      recordNumber: "3",
      registeredAt: registeredDaysAgo(15),
      weightKg: 5,
    };
    const recyclable = { ...wasteB, registeredAt: registeredDaysAgo(12) };
    inventoryMocks.listWaste.mockResolvedValueOnce(success([organicHeavy, organicLight, recyclable]));
    inventoryMocks.listContainers.mockResolvedValueOnce(success([containerA, containerB]));

    render(<InventoryPage />);
    expect(await screen.findByText("RES-003")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("inventory.ageFilter"), { target: { value: "from8To30" } });
    fireEvent.change(screen.getByLabelText("inventory.categoryFilter"), { target: { value: "organic" } });
    fireEvent.change(screen.getByLabelText("inventory.containerFilter"), { target: { value: containerA.id } });
    fireEvent.change(screen.getByLabelText("inventory.sortBy"), { target: { value: "weightAsc" } });
    fireEvent.click(screen.getByRole("button", { name: "inventory.exportExcel" }));

    await waitFor(() => expect(inventoryMocks.saveExcel).toHaveBeenCalledTimes(1));
    const exportedRecords = inventoryMocks.saveExcel.mock.calls[0]?.[0] as Array<{ id: string }>;
    expect(exportedRecords.map(({ id }) => id)).toEqual([organicLight.id, organicHeavy.id]);
  });
});
