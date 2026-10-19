import {
  cleanup,
  fireEvent,
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
    t: (key: string) => key,
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

// ── Datos de prueba ───────────────────────────────────────────────────────────
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

const buyerWithPurchases = {
  ...base,
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Comprador Activo",
  purchaseCount: 5,
};
const buyerWithoutPurchases = {
  ...base,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Comprador Inactivo",
  purchaseCount: 0,
};

// ── Setup / Teardown ──────────────────────────────────────────────────────────
afterEach(cleanup);
beforeEach(() => {
  authState.current = { user };
  buyerMocks.listBuyers.mockResolvedValue({
    ok: true,
    data: [buyerWithPurchases, buyerWithoutPurchases],
  });
  salesMocks.listSales.mockResolvedValue({ ok: true, data: [] });
  csvMocks.saveBuyerCsv.mockResolvedValue("saved");
  excelMocks.saveBuyerExcel.mockResolvedValue("saved");
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function renderPage() {
  render(<BuyersPage />);
  // Esperar a que la carga de compradores finalice
  await waitFor(() => expect(screen.queryByText("buyers.loading")).toBeNull());
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("buyer commercial activity filter", () => {
  test('filter "all" shows all buyers', async () => {
    await renderPage();

    expect(screen.getByText("Comprador Activo")).toBeTruthy();
    expect(screen.getByText("Comprador Inactivo")).toBeTruthy();
  }, 15_000);

  test('filter "with_purchases" shows only buyers with purchaseCount > 0', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText("buyers.activityFilter"), {
      target: { value: "with_purchases" },
    });

    expect(screen.getByText("Comprador Activo")).toBeTruthy();
    expect(screen.queryByText("Comprador Inactivo")).toBeNull();
  }, 15_000);

  test('filter "without_purchases" shows only buyers with purchaseCount === 0', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText("buyers.activityFilter"), {
      target: { value: "without_purchases" },
    });

    expect(screen.queryByText("Comprador Activo")).toBeNull();
    expect(screen.getByText("Comprador Inactivo")).toBeTruthy();
  }, 15_000);

  test('switching back to "all" restores both buyers', async () => {
    await renderPage();

    const select = screen.getByLabelText("buyers.activityFilter");

    fireEvent.change(select, { target: { value: "with_purchases" } });
    expect(screen.queryByText("Comprador Inactivo")).toBeNull();

    fireEvent.change(select, { target: { value: "all" } });
    expect(screen.getByText("Comprador Activo")).toBeTruthy();
    expect(screen.getByText("Comprador Inactivo")).toBeTruthy();
  }, 15_000);

  test("clearFilters button resets activity filter to all", async () => {
    await renderPage();

    // Combinar "with_purchases" + búsqueda sin coincidencias → 0 resultados
    // → estado vacío → el botón clearFilters se renderiza
    fireEvent.change(screen.getByLabelText("buyers.activityFilter"), {
      target: { value: "with_purchases" },
    });
    fireEvent.change(screen.getByPlaceholderText("buyers.searchPlaceholder"), {
      target: { value: "ZZZZZZZ" },
    });

    // findByRole espera activamente el botón (hasta 15 s), robusto frente a batching de React 18
    const clearBtn = await screen.findByRole("button", { name: "buyers.clearFilters" });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText("Comprador Activo")).toBeTruthy();
      expect(screen.getByText("Comprador Inactivo")).toBeTruthy();
    });
  }, 15_000);
});
