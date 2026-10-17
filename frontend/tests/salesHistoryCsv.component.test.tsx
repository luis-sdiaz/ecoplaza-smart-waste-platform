import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type TimestampRange = {
  startInclusive: string;
  endExclusive: string;
};

type Sale = {
  id: string;
  buyerId: string;
  wasteRecordId: string;
  weightKg: number;
  unitPrice: number;
  totalValue: number;
  soldAt: string;
  buyerName: string;
  wasteRecordNumber: string;
  category: "organic" | "recyclable" | "nonRecyclable";
};

type SalesResult =
  | { ok: true; data: Sale[] }
  | { ok: false; error: { code: string; retryable: boolean } };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const salesMocks = vi.hoisted(() => ({
  listSales: vi.fn(),
  getSaleFormData: vi.fn(),
  createSale: vi.fn(),
}));

const nativeMocks = vi.hoisted(() => ({
  save: vi.fn(),
  writeTextFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Manager",
      email: "manager@ecoplaza.test",
      avatarUrl: null,
    },
  }),
}));

vi.mock("../src/services/salesService", () => ({
  listSales: salesMocks.listSales,
  getSaleFormData: salesMocks.getSaleFormData,
  createSale: salesMocks.createSale,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: nativeMocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: nativeMocks.writeTextFile,
  writeFile: nativeMocks.writeFile,
}));
vi.mock("../src/components/DemoSalesTable", () => ({ default: () => null }));
vi.mock("../src/components/SaleRegistrationModal", () => ({ default: () => null }));
vi.mock("../src/components/SaleDetailsModal", () => ({ default: () => null }));

import SalesPage from "../src/pages/SalesPage";

const buyerAlpha = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Alpha Recycling",
  email: "alpha@example.test",
  phone: "",
  registeredAt: "2026-01-01T12:00:00.000Z",
};
const buyerBeta = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Beta Compost",
  email: "beta@example.test",
  phone: "",
  registeredAt: "2026-01-02T12:00:00.000Z",
};

const saleAlphaEarly: Sale = {
  id: "10000001-0000-4000-8000-000000000001",
  buyerId: buyerAlpha.id,
  wasteRecordId: "20000000-0000-4000-8000-000000000001",
  weightKg: 10,
  unitPrice: 100,
  totalValue: 1000,
  soldAt: "2026-10-01T15:00:00.000Z",
  buyerName: buyerAlpha.name,
  wasteRecordNumber: "1",
  category: "recyclable",
};
const saleBeta: Sale = {
  id: "10000002-0000-4000-8000-000000000002",
  buyerId: buyerBeta.id,
  wasteRecordId: "20000000-0000-4000-8000-000000000002",
  weightKg: 20,
  unitPrice: 200,
  totalValue: 4000,
  soldAt: "2026-10-10T15:00:00.000Z",
  buyerName: buyerBeta.name,
  wasteRecordNumber: "2",
  category: "organic",
};
const saleAlphaLate: Sale = {
  id: "10000003-0000-4000-8000-000000000003",
  buyerId: buyerAlpha.id,
  wasteRecordId: "20000000-0000-4000-8000-000000000003",
  weightKg: 30,
  unitPrice: 300,
  totalValue: 9000,
  soldAt: "2026-10-20T15:00:00.000Z",
  buyerName: buyerAlpha.name,
  wasteRecordNumber: "3",
  category: "nonRecyclable",
};
const allSales = [saleAlphaLate, saleBeta, saleAlphaEarly];

const formData = {
  buyers: [buyerAlpha, buyerBeta],
  wasteRecords: [{
    id: "30000000-0000-4000-8000-000000000001",
    recordNumber: "4",
    containerId: "40000000-0000-4000-8000-000000000001",
    category: "organic" as const,
    weightKg: 5,
    registeredAt: "2026-10-21T15:00:00.000Z",
    status: "available" as const,
  }],
  containers: [{
    id: "40000000-0000-4000-8000-000000000001",
    code: "CON-001",
    registeredAt: "2026-01-01T12:00:00.000Z",
  }],
};

function filteredSales(dateRange?: TimestampRange, buyerId?: string): Sale[] {
  return allSales.filter((sale) => (
    (buyerId === undefined || sale.buyerId === buyerId)
    && (dateRange === undefined || (
      sale.soldAt >= dateRange.startInclusive
      && sale.soldAt < dateRange.endExclusive
    ))
  ));
}

function mockSuccessfulServices() {
  salesMocks.listSales.mockImplementation(
    async (dateRange?: TimestampRange, buyerId?: string) => ({
      ok: true,
      data: filteredSales(dateRange, buyerId),
    }),
  );
  salesMocks.getSaleFormData.mockResolvedValue({ ok: true, data: formData });
}

function expectVisible(ids: string[]) {
  for (const sale of allSales) {
    if (ids.includes(sale.id)) {
      expect(screen.getByTitle(sale.id)).toBeTruthy();
    } else {
      expect(screen.queryByTitle(sale.id)).toBeNull();
    }
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  salesMocks.listSales.mockReset();
  salesMocks.getSaleFormData.mockReset();
  salesMocks.createSale.mockReset();
  nativeMocks.save.mockReset();
  nativeMocks.writeTextFile.mockReset();
  nativeMocks.writeFile.mockReset();
  mockSuccessfulServices();
  nativeMocks.save.mockResolvedValue("C:\\exports\\sales.csv");
  nativeMocks.writeTextFile.mockResolvedValue(undefined);
  nativeMocks.writeFile.mockResolvedValue(undefined);
});

describe("filtered sales history and CSV integration", () => {
  test("searches by full and short sale identifiers and exports only matches", async () => {
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    const search = screen.getByLabelText("sales.saleSearchLabel");
    fireEvent.change(search, { target: { value: `  sal-${saleBeta.id.slice(0, 8).toUpperCase()}  ` } });
    await waitFor(() => expectVisible([saleBeta.id]));

    fireEvent.click(screen.getByRole("button", { name: "sales.exportCsv" }));
    await waitFor(() => expect(nativeMocks.writeTextFile).toHaveBeenCalledOnce());
    const csv = nativeMocks.writeTextFile.mock.calls[0][1] as string;
    expect(csv).toContain(saleBeta.id);
    expect(csv).not.toContain(saleAlphaEarly.id);
    expect(csv).not.toContain(saleAlphaLate.id);

    fireEvent.change(search, { target: { value: saleAlphaEarly.id.toUpperCase() } });
    await waitFor(() => expectVisible([saleAlphaEarly.id]));
    fireEvent.change(search, { target: { value: "missing-id" } });
    expect(await screen.findByText("sales.emptySearchTitle")).toBeTruthy();
  }, 15_000);

  test("combines buyer and date filters and exports exactly the visible history", async () => {
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);
    expectVisible(allSales.map((sale) => sale.id));

    fireEvent.change(screen.getByLabelText("sales.buyerFilter"), {
      target: { value: buyerAlpha.id },
    });
    await waitFor(() => expectVisible([saleAlphaLate.id, saleAlphaEarly.id]));

    fireEvent.change(screen.getByLabelText("sales.startDate"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.change(screen.getByLabelText("sales.endDate"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sales.applyDateRange" }));

    await waitFor(() => expectVisible([saleAlphaLate.id]));
    fireEvent.click(screen.getByRole("button", { name: "sales.exportCsv" }));

    await waitFor(() => expect(nativeMocks.writeTextFile).toHaveBeenCalledOnce());
    const [path, csv] = nativeMocks.writeTextFile.mock.calls[0] as [string, string];
    expect(path).toBe("C:\\exports\\sales.csv");
    expect(csv).toContain(saleAlphaLate.id);
    expect(csv).not.toContain(saleAlphaEarly.id);
    expect(csv).not.toContain(saleBeta.id);
    expect(csv).toContain("sales.csv.reference,sales.csv.completedAt");

    const lastCall = salesMocks.listSales.mock.calls.at(-1)!;
    expect(lastCall[1]).toBe(buyerAlpha.id);
    expect(lastCall[0]).toEqual(expect.objectContaining({
      startInclusive: expect.any(String),
      endExclusive: expect.any(String),
    }));
  });

  test("filters the visible history by date without a buyer selection", async () => {
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    fireEvent.change(screen.getByLabelText("sales.startDate"), {
      target: { value: "2026-10-05" },
    });
    fireEvent.change(screen.getByLabelText("sales.endDate"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sales.applyDateRange" }));

    await waitFor(() => expectVisible([saleBeta.id]));
    const lastCall = salesMocks.listSales.mock.calls.at(-1)!;
    expect(lastCall[0]).toEqual(expect.objectContaining({
      startInclusive: expect.any(String),
      endExclusive: expect.any(String),
    }));
    expect(lastCall[1]).toBeUndefined();
  });

  test("applies a shared quick date preset with category, metrics, and CSV filters", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    fireEvent.click(screen.getByRole("button", { name: "sales.last7Days" }));
    await waitFor(() => expectVisible([saleBeta.id]));
    expect((screen.getByLabelText("sales.startDate") as HTMLInputElement).value).toBe("2026-10-10");
    expect((screen.getByLabelText("sales.endDate") as HTMLInputElement).value).toBe("2026-10-16");

    fireEvent.change(screen.getByLabelText("sales.categoryFilter"), { target: { value: "organic" } });
    expectVisible([saleBeta.id]);
    expect(screen.getAllByText("20 common.kg")).toHaveLength(3);
    const categorySummary = screen.getByRole("region", { name: "sales.categorySummaryTitle" });
    expect(within(categorySummary).getByText("20 common.kg")).toBeTruthy();
    expect(within(categorySummary).getByText(/COP\s4,000/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "sales.exportCsv" }));
    await waitFor(() => expect(nativeMocks.writeTextFile).toHaveBeenCalledOnce());
    const csv = nativeMocks.writeTextFile.mock.calls[0][1] as string;
    expect(csv).toContain(saleBeta.id);
    expect(csv).not.toContain(saleAlphaEarly.id);
    expect(csv).not.toContain(saleAlphaLate.id);
  });

  test("keeps table, metrics, and CSV aligned with inclusive amount limits", async () => {
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    fireEvent.change(screen.getByLabelText("sales.minimumAmount"), { target: { value: "4000" } });
    fireEvent.change(screen.getByLabelText("sales.maximumAmount"), { target: { value: "4000.00" } });
    expectVisible([saleBeta.id]);
    expect(screen.getAllByText(/4,000/).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: "sales.exportCsv" }));
    await waitFor(() => expect(nativeMocks.writeTextFile).toHaveBeenCalledOnce());
    const csv = nativeMocks.writeTextFile.mock.calls[0][1] as string;
    expect(csv).toContain(saleBeta.id);
    expect(csv).not.toContain(saleAlphaEarly.id);
    expect(csv).not.toContain(saleAlphaLate.id);

    fireEvent.change(screen.getByLabelText("sales.minimumAmount"), { target: { value: "5000" } });
    expect(screen.getByText("sales.invalidAmountRange")).toBeTruthy();
    expect(screen.getByRole("button", { name: "sales.exportCsv" }).hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("sales.maximumAmount"), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText("sales.minimumAmount"), { target: { value: "10000" } });
    expect(await screen.findByText("sales.emptyTitle")).toBeTruthy();
  });

  test("exports the visible filtered and sorted sales to a formatted native Excel workbook", async () => {
    nativeMocks.save.mockResolvedValueOnce("C:\\exports\\sales.xlsx");
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    fireEvent.change(screen.getByLabelText("sales.buyerFilter"), { target: { value: buyerAlpha.id } });
    await waitFor(() => expectVisible([saleAlphaLate.id, saleAlphaEarly.id]));
    fireEvent.change(screen.getByLabelText("sales.minimumAmount"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("sales.maximumAmount"), { target: { value: "9000" } });
    fireEvent.change(screen.getByLabelText("sales.saleSearchLabel"), { target: { value: "1000000" } });
    fireEvent.change(screen.getByLabelText("sales.sortBy"), { target: { value: "valueAsc" } });

    fireEvent.click(screen.getByRole("button", { name: "sales.exportExcel" }));
    await waitFor(() => expect(nativeMocks.writeFile).toHaveBeenCalledOnce(), { timeout: 15_000 });
    const [path, bytes] = nativeMocks.writeFile.mock.calls[0] as [string, Uint8Array];
    expect(path).toBe("C:\\exports\\sales.xlsx");

    const excelModule = await import("exceljs");
    const Workbook = excelModule.Workbook ??
      (excelModule as unknown as { default: typeof excelModule }).default.Workbook;
    const workbook = new Workbook();
    await workbook.xlsx.load(bytes);
    const worksheet = workbook.getWorksheet("sales.excel.sheetName")!;
    expect(worksheet.getColumn(1).values.slice(4)).toEqual([saleAlphaEarly.id, saleAlphaLate.id]);
    expect(worksheet.getCell("B4").value).toBe(buyerAlpha.name);
    expect(worksheet.getCell("C4").value).toBeInstanceOf(Date);
    expect(worksheet.getCell("E4").numFmt).toContain("kg");
    expect(worksheet.getCell("G4").numFmt).toContain("COP");
    expect(worksheet.views[0]?.state).toBe("frozen");
    expect(worksheet.autoFilter).toBeTruthy();
  }, 20_000);

  test("shows the combined-filter empty state and prevents an empty export", async () => {
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);

    fireEvent.change(screen.getByLabelText("sales.buyerFilter"), {
      target: { value: buyerBeta.id },
    });
    await screen.findByTitle(saleBeta.id);
    fireEvent.change(screen.getByLabelText("sales.startDate"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.change(screen.getByLabelText("sales.endDate"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sales.applyDateRange" }));

    expect(await screen.findByText("sales.emptyBuyerPeriodTitle")).toBeTruthy();
    const exportButton = screen.getByRole("button", { name: "sales.exportCsv" });
    expect(exportButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(exportButton);
    expect(nativeMocks.save).not.toHaveBeenCalled();
  });

  test("renders load failures, retries them, and reports native export failures", async () => {
    salesMocks.listSales.mockResolvedValueOnce({
      ok: false,
      error: { code: "network_error", retryable: true },
    });
    render(<SalesPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("sales.networkError");
    fireEvent.click(screen.getByRole("button", { name: "sales.retry" }));
    await screen.findByTitle(saleAlphaLate.id);

    nativeMocks.save.mockRejectedValueOnce(new Error("native dialog failed"));
    fireEvent.click(screen.getByRole("button", { name: "sales.exportCsv" }));

    expect((await screen.findByRole("alert")).textContent).toContain("sales.exportFileError");
    expect(nativeMocks.writeTextFile).not.toHaveBeenCalled();
  });

  test("ignores an obsolete filtered response after a newer filter finishes", async () => {
    const pendingAlpha = deferred<SalesResult>();
    salesMocks.listSales
      .mockResolvedValueOnce({ ok: true, data: allSales })
      .mockReturnValueOnce(pendingAlpha.promise)
      .mockResolvedValueOnce({ ok: true, data: [saleBeta] });
    render(<SalesPage />);
    await screen.findByTitle(saleAlphaLate.id);
    const buyerFilter = screen.getByLabelText("sales.buyerFilter");

    fireEvent.change(buyerFilter, { target: { value: buyerAlpha.id } });
    fireEvent.change(buyerFilter, { target: { value: buyerBeta.id } });

    await screen.findByTitle(saleBeta.id);
    expectVisible([saleBeta.id]);

    await act(async () => {
      pendingAlpha.resolve({ ok: true, data: [saleAlphaLate, saleAlphaEarly] });
      await pendingAlpha.promise;
    });

    expectVisible([saleBeta.id]);
  });
});
