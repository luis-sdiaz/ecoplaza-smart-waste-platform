import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// ── Mocks hoisted ────────────────────────────────────────────────────────────
const authState = vi.hoisted(() => ({
  current: { user: null } as { user: TestUser | null },
}));
const buyerMocks = vi.hoisted(() => ({ listBuyers: vi.fn() }));
const salesMocks = vi.hoisted(() => ({ listSales: vi.fn() }));
const csvMocks = vi.hoisted(() => ({ saveBuyerCsv: vi.fn() }));
const excelMocks = vi.hoisted(() => ({ saveBuyerExcel: vi.fn() }));

type TestUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "buyers.summaryShare" && options?.percentage !== undefined) {
        return `${options.percentage}% of total`;
      }
      return key;
    },
    i18n: { resolvedLanguage: "en" },
  }),
}));
vi.mock("../src/services/buyerService", () => ({
  listBuyers: buyerMocks.listBuyers,
  createBuyer: vi.fn(),
  updateBuyer: vi.fn(),
}));
vi.mock("../src/services/salesService", () => ({
  listSales: salesMocks.listSales,
}));
vi.mock("../src/services/buyerCsv", () => ({
  saveBuyerCsv: csvMocks.saveBuyerCsv,
}));
vi.mock("../src/services/buyerExcelService", () => ({
  saveBuyerExcel: excelMocks.saveBuyerExcel,
}));
vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => ({ showDemoData: false }),
}));

import BuyersPage from "../src/pages/BuyersPage";

const user: TestUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  name: "Test User",
  avatarUrl: null,
};

const base = {
  email: null,
  phone: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

afterEach(cleanup);
beforeEach(() => {
  authState.current = { user };
  salesMocks.listSales.mockResolvedValue({ ok: true, data: [] });
  csvMocks.saveBuyerCsv.mockResolvedValue("saved");
  excelMocks.saveBuyerExcel.mockResolvedValue("saved");
});

async function renderPage() {
  render(<BuyersPage />);
  await waitFor(() => expect(screen.queryByText("buyers.loading")).toBeNull());
}

describe("buyer activity summary rendering", () => {
  test("renders counts and percentage for mixed buyers data", async () => {
    const mixedBuyers = [
      { ...base, id: "buyer-1", name: "Alfa", purchaseCount: 3 },
      { ...base, id: "buyer-2", name: "Beta", purchaseCount: 0 },
      { ...base, id: "buyer-3", name: "Gamma" },
    ];
    buyerMocks.listBuyers.mockResolvedValue({ ok: true, data: mixedBuyers });

    await renderPage();

    const summarySection = screen.getByRole("region", { name: "buyers.summaryTotal" });
    expect(summarySection).toBeTruthy();

    expect(screen.getByText("buyers.summaryTotal")).toBeTruthy();
    expect(screen.getByText("buyers.summaryWithPurchases")).toBeTruthy();
    expect(screen.getByText("buyers.summaryWithoutPurchases")).toBeTruthy();
    expect(screen.getByText("66.7% of total")).toBeTruthy();

    expect(summarySection.textContent).toContain("3");
    expect(summarySection.textContent).toContain("1");
    expect(summarySection.textContent).toContain("2");
  }, 15_000);

  test("renders 0% without purchases when all buyers have purchases", async () => {
    const buyers = [
      { ...base, id: "buyer-1", name: "Alfa", purchaseCount: 2 },
      { ...base, id: "buyer-2", name: "Beta", purchaseCount: 1 },
    ];
    buyerMocks.listBuyers.mockResolvedValue({ ok: true, data: buyers });

    await renderPage();

    const summarySection = screen.getByRole("region", { name: "buyers.summaryTotal" });
    expect(summarySection).toBeTruthy();
    expect(screen.getByText("0% of total")).toBeTruthy();
    expect(summarySection.textContent).toContain("2");
    expect(summarySection.textContent).toContain("0");
  }, 15_000);

  test("renders 100% without purchases when no buyers have purchases", async () => {
    const buyers = [
      { ...base, id: "buyer-1", name: "Alfa", purchaseCount: 0 },
      { ...base, id: "buyer-2", name: "Beta" },
    ];
    buyerMocks.listBuyers.mockResolvedValue({ ok: true, data: buyers });

    await renderPage();

    const summarySection = screen.getByRole("region", { name: "buyers.summaryTotal" });
    expect(summarySection).toBeTruthy();
    expect(screen.getByText("100% of total")).toBeTruthy();
    expect(summarySection.textContent).toContain("2");
    expect(summarySection.textContent).toContain("0");
  }, 15_000);

  test("renders safe 0s when buyers list is empty", async () => {
    buyerMocks.listBuyers.mockResolvedValue({ ok: true, data: [] });

    await renderPage();

    const summarySection = screen.getByRole("region", { name: "buyers.summaryTotal" });
    expect(summarySection).toBeTruthy();
    expect(screen.getByText("0% of total")).toBeTruthy();
    expect(summarySection.textContent).toContain("0");
  }, 15_000);
});

