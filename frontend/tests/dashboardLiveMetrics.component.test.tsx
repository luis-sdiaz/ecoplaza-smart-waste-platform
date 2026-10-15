import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authState = vi.hoisted(() => ({ current: { user: null } as { user: TestUser | null } }));
const reportMocks = vi.hoisted(() => ({ getReportStatistics: vi.fn() }));

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
  return {
    wasteRecordCount: availableWeightKg === 0 ? 0 : 2,
    totalRegisteredWeightKg: availableWeightKg,
    availableWeightKg,
    soldWeightKg: grossSalesValue === 0 ? 0 : 5,
    salesCount: grossSalesValue === 0 ? 0 : 1,
    grossSalesValue,
    distribution: [
      { category: "organic" as const, weightKg: availableWeightKg, percentage: availableWeightKg === 0 ? 0 : 100 },
      { category: "recyclable" as const, weightKg: 0, percentage: 0 },
      { category: "nonRecyclable" as const, weightKg: 0, percentage: 0 },
    ],
    salesTrend: [],
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

import DashboardPage from "../src/pages/DashboardPage";

afterEach(cleanup);

beforeEach(() => {
  authState.current = { user: userA };
  reportMocks.getReportStatistics.mockReset();
});

function metric(title: string): HTMLElement {
  return screen.getByText(title).closest("article")!;
}

describe("Dashboard live commercial metrics", () => {
  test("renders available inventory and gross sales from the report service", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(25, 1250.5)));

    render(<DashboardPage />);

    expect(await within(metric("dashboard.availableInventory")).findByText("25 kg")).toBeTruthy();
    expect(await within(metric("dashboard.revenue")).findByText(/COP.*1,250\.5/)).toBeTruthy();
    expect(within(metric("dashboard.revenue")).getByText("dashboard.realData")).toBeTruthy();
  });

  test("shows real zero values and an empty commercial state", async () => {
    reportMocks.getReportStatistics.mockResolvedValueOnce(success(statistics(0, 0)));

    render(<DashboardPage />);

    expect(await screen.findByText("dashboard.emptyCommercialActivity")).toBeTruthy();
    expect(within(metric("dashboard.availableInventory")).getByText("0 kg")).toBeTruthy();
    expect(within(metric("dashboard.revenue")).getByText(/COP.*0/)).toBeTruthy();
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
