import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authState = vi.hoisted(() => ({ current: { user: null } as { user: TestUser | null } }));
const reportMocks = vi.hoisted(() => ({ getReportStatistics: vi.fn() }));
const salesMocks = vi.hoisted(() => ({ listSales: vi.fn() }));
const inventoryMocks = vi.hoisted(() => ({
  listAvailableWasteRecords: vi.fn(),
  listContainers: vi.fn(),
}));

type TestUser = { id: string };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const userA = { id: "11111111-1111-4111-8111-111111111111" };
const userB = { id: "22222222-2222-4222-8222-222222222222" };

function statistics(availableWeightKg: number, grossSalesValue: number) {
  const soldWeightKg = grossSalesValue === 0 ? 0 : 5;
  return {
    wasteRecordCount: availableWeightKg === 0 ? 0 : 2,
    totalRegisteredWeightKg: availableWeightKg + soldWeightKg,
    availableWeightKg,
    soldWeightKg,
    salesCount: grossSalesValue === 0 ? 0 : 1,
    grossSalesValue,
    distribution: [
      { category: "organic" as const, weightKg: availableWeightKg, percentage: availableWeightKg === 0 ? 0 : 100 },
      { category: "recyclable" as const, weightKg: 0, percentage: 0 },
      { category: "nonRecyclable" as const, weightKg: 0, percentage: 0 },
    ],
    salesByCategory: [],
    salesTrend: [],
    monthlySales: [],
    topBuyers: [],
  };
}

const success = (data: ReturnType<typeof statistics>) => ({ ok: true as const, data });

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key === "common.kg" ? "kg" : key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../src/services/reportService", () => ({
  getReportStatistics: reportMocks.getReportStatistics,
}));

vi.mock("../src/services/salesService", () => ({
  listSales: salesMocks.listSales,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: inventoryMocks.listAvailableWasteRecords,
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: inventoryMocks.listContainers,
}));

import DashboardPage from "../src/pages/DashboardPage";

afterEach(cleanup);

beforeEach(() => {
  authState.current = { user: userA };
  reportMocks.getReportStatistics.mockReset();
  salesMocks.listSales.mockReset();
  salesMocks.listSales.mockResolvedValue({ ok: true, data: [] });
  inventoryMocks.listAvailableWasteRecords.mockReset();
  inventoryMocks.listContainers.mockReset();
  inventoryMocks.listAvailableWasteRecords.mockResolvedValue({ ok: true, data: [] });
  inventoryMocks.listContainers.mockResolvedValue({ ok: true, data: [] });
});

function metric(title: string): HTMLElement {
  return screen.getByText(title).closest("article")!;
}

describe("Dashboard live commercial metrics", () => {
  test("renders at most five newest real sales", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(10, 100)));
    const sales = Array.from({ length: 6 }, (_, index) => ({
      id: `sale-${index}`,
      buyerId: userA.id,
      wasteRecordId: `waste-${index}`,
      weightKg: index + 1,
      unitPrice: 100,
      totalValue: (index + 1) * 100,
      soldAt: `2026-10-${String(index + 10).padStart(2, "0")}T12:00:00.000Z`,
      buyerName: `Buyer ${index}`,
      wasteRecordNumber: String(index + 1),
      category: "organic" as const,
    }));
    salesMocks.listSales.mockResolvedValueOnce({ ok: true, data: sales });

    render(<DashboardPage />);

    expect(await screen.findByTitle("sale-5")).toBeTruthy();
    expect(screen.getByTitle("sale-1")).toBeTruthy();
    expect(screen.queryByTitle("sale-0")).toBeNull();
    expect(screen.getAllByTitle(/^sale-/)).toHaveLength(5);
  });

  test("isolates recent-sales failures from dashboard metrics", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(25, 1250.5)));
    salesMocks.listSales.mockResolvedValueOnce({ ok: false, error: { code: "network_error", retryable: true } });

    render(<DashboardPage />);

    expect(await screen.findByText("dashboard.recentSalesError")).toBeTruthy();
    expect(within(metric("dashboard.availableInventory")).getByText("25 kg")).toBeTruthy();
    expect(within(metric("dashboard.revenue")).getByText(/COP.*1,250\.5/)).toBeTruthy();
  });

  test("isolates aging-inventory failures from metrics and recent sales", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(25, 1250.5)));
    salesMocks.listSales.mockResolvedValueOnce({ ok: true, data: [{
      id: "sale-visible", buyerId: userA.id, wasteRecordId: "waste-sold", weightKg: 2,
      unitPrice: 100, totalValue: 200, soldAt: "2026-10-16T12:00:00.000Z",
      buyerName: "Visible buyer", wasteRecordNumber: "2", category: "recyclable" as const,
    }] });
    inventoryMocks.listAvailableWasteRecords.mockResolvedValueOnce({
      ok: false, error: { code: "network_error", retryable: true },
    });

    render(<DashboardPage />);

    expect(await screen.findByText("dashboard.oldestInventoryError")).toBeTruthy();
    expect(within(metric("dashboard.availableInventory")).getByText("25 kg")).toBeTruthy();
    expect(screen.getByTitle("sale-visible")).toBeTruthy();
  });

  test("discards delayed aging inventory after switching accounts", async () => {
    const pendingWasteA = deferred<{ ok: true; data: Array<Record<string, unknown>> }>();
    const recordB = {
      id: "waste-b", recordNumber: "2", containerId: "container-b", category: "organic" as const,
      weightKg: 8, registeredAt: "2025-01-01T12:00:00.000Z", status: "available" as const,
    };
    const recordA = { ...recordB, id: "waste-a", recordNumber: "1", containerId: "container-a" };
    inventoryMocks.listAvailableWasteRecords
      .mockReturnValueOnce(pendingWasteA.promise)
      .mockResolvedValueOnce({ ok: true, data: [recordB] });
    inventoryMocks.listContainers
      .mockResolvedValueOnce({ ok: true, data: [{ id: "container-a", code: "CTR-A" }] })
      .mockResolvedValueOnce({ ok: true, data: [{ id: "container-b", code: "CTR-B" }] });
    reportMocks.getReportStatistics.mockResolvedValue(success(statistics(8, 0)));

    const view = render(<DashboardPage />);
    authState.current = { user: userB };
    view.rerender(<DashboardPage />);

    expect(await screen.findByTitle("waste-b")).toBeTruthy();
    await act(async () => {
      pendingWasteA.resolve({ ok: true, data: [recordA] });
      await pendingWasteA.promise;
    });
    expect(screen.queryByTitle("waste-a")).toBeNull();
    expect(screen.getByTitle("waste-b")).toBeTruthy();
  });

  test("does not show stale recent sales after an account switch", async () => {
    const pendingA = deferred<{ ok: true; data: Array<Record<string, unknown>> }>();
    const saleB = { id: "sale-b", buyerId: userB.id, wasteRecordId: "waste-b", weightKg: 2, unitPrice: 100, totalValue: 200, soldAt: "2026-10-16T12:00:00.000Z", buyerName: "Buyer B", wasteRecordNumber: "2", category: "recyclable" as const };
    const saleA = { ...saleB, id: "sale-a", buyerId: userA.id, buyerName: "Buyer A" };
    salesMocks.listSales.mockReturnValueOnce(pendingA.promise).mockResolvedValueOnce({ ok: true, data: [saleB] });
    reportMocks.getReportStatistics.mockResolvedValue(success(statistics(10, 200)));

    const view = render(<DashboardPage />);
    authState.current = { user: userB };
    view.rerender(<DashboardPage />);
    expect(await screen.findByTitle("sale-b")).toBeTruthy();

    await act(async () => {
      pendingA.resolve({ ok: true, data: [saleA] });
      await pendingA.promise;
    });
    expect(screen.queryByTitle("sale-a")).toBeNull();
    expect(screen.getByTitle("sale-b")).toBeTruthy();
  });

  test("renders available inventory and gross sales from the report service", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(25, 1250.5)));

    render(<DashboardPage />);

    expect(await within(metric("dashboard.availableInventory")).findByText("25 kg")).toBeTruthy();
    expect(await within(metric("dashboard.revenue")).findByText(/COP.*1,250\.5/)).toBeTruthy();
    expect(within(metric("dashboard.revenue")).getByText("dashboard.realData")).toBeTruthy();
    expect(await screen.findByText("dashboard.materialStatusAvailable")).toBeTruthy();
    expect(screen.getByText("25 kg · 83.3%")).toBeTruthy();
    expect(screen.getByText("5 kg · 16.7%")).toBeTruthy();
  });

  test("shows real zero values and an empty commercial state", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(0, 0)));

    render(<DashboardPage />);

    expect(await screen.findByText("dashboard.emptyCommercialActivity")).toBeTruthy();
    expect(within(metric("dashboard.availableInventory")).getByText("0 kg")).toBeTruthy();
    expect(within(metric("dashboard.revenue")).getByText(/COP.*0/)).toBeTruthy();
    expect(screen.getByText("dashboard.materialStatusEmpty")).toBeTruthy();
  });

  test("clears user A metrics and ignores its delayed response after switching to B", async () => {
    const pendingA = deferred<ReturnType<typeof success>>();
    reportMocks.getReportStatistics
      .mockReturnValueOnce(pendingA.promise)
      .mockResolvedValueOnce(success(statistics(40, 900)));

    const view = render(<DashboardPage />);
    authState.current = { user: userB };
    view.rerender(<DashboardPage />);

    expect(await within(metric("dashboard.availableInventory")).findByText("40 kg")).toBeTruthy();

    await act(async () => {
      pendingA.resolve(success(statistics(999, 999999)));
      await pendingA.promise;
    });

    expect(within(metric("dashboard.availableInventory")).getByText("40 kg")).toBeTruthy();
    expect(screen.queryByText("999 kg")).toBeNull();
    expect(screen.queryByText(/999,999/)).toBeNull();
  });
});
