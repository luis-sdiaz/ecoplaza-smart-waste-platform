import { beforeEach, describe, expect, test, vi } from "vitest";

const tauriMocks = vi.hoisted(() => ({
  save: vi.fn(),
  writeTextFile: vi.fn(),
}));
const salesMocks = vi.hoisted(() => ({ listSales: vi.fn() }));

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: tauriMocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: tauriMocks.writeTextFile }));
vi.mock("../src/services/salesService", () => ({ listSales: salesMocks.listSales }));

import { saveCsvFile } from "../src/services/csvService";
import { createReportCsv, saveReportCsv } from "../src/services/reportCsvService";
import { createSalesCsv } from "../src/services/salesCsv";
import { exportSalesHistory } from "../src/services/salesCsvService";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

const categories = {
  organic: "Organic",
  recyclable: "Recyclable",
  nonRecyclable: "Other",
};
const reportLabels = {
  section: "Section", metric: "Metric", value: "Value", unit: "Unit",
  summary: "Summary", distribution: "Distribution", category: "Category",
  weight: "Weight", percentage: "Percentage", records: "Records",
  historicalWeight: "Historical", availableWeight: "Available", soldWeight: "Sold",
  sales: "Sales", grossRevenue: "Revenue", countUnit: "records", kilogramsUnit: "kg",
  copUnit: "COP", period: "Period", from: "From", to: "To", allTime: "All",
  categories,
};
const report = {
  wasteRecordCount: 1,
  totalRegisteredWeightKg: 5,
  availableWeightKg: 0,
  soldWeightKg: 5,
  salesCount: 1,
  grossSalesValue: 100,
  distribution: [{ category: "organic" as const, weightKg: 5, percentage: 100 }],
  salesByCategory: [],
  salesTrend: [],
};
const salesLabels = {
  reference: "Reference", completedAt: "Date", category: "Category",
  weightKg: "Weight", unitPriceCop: "Price", totalValueCop: "Total", categories,
};
const sale = {
  id: "12345678-1234-4234-8234-123456789abc",
  buyerId: "22345678-1234-4234-8234-123456789abc",
  wasteRecordId: "32345678-1234-4234-8234-123456789abc",
  weightKg: 5,
  unitPrice: 20,
  totalValue: 100,
  soldAt: "2026-10-13T15:30:00.000Z",
  buyerName: "Buyer",
  wasteRecordNumber: "1",
  category: "organic" as const,
};

beforeEach(() => {
  tauriMocks.save.mockReset();
  tauriMocks.writeTextFile.mockReset();
  salesMocks.listSales.mockReset();
});

describe("native CSV save flows", () => {
  test("writes the exact report CSV after the user confirms a location", async () => {
    tauriMocks.save.mockResolvedValueOnce("C:\\exports\\report.csv");
    tauriMocks.writeTextFile.mockResolvedValueOnce(undefined);

    await expect(saveReportCsv(report, reportLabels, "report.csv")).resolves.toBe("saved");
    expect(tauriMocks.save).toHaveBeenCalledWith({
      defaultPath: "report.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    expect(tauriMocks.writeTextFile).toHaveBeenCalledWith(
      "C:\\exports\\report.csv",
      createReportCsv(report, reportLabels),
    );
  });

  test("does not write or report success when the report dialog is cancelled", async () => {
    tauriMocks.save.mockResolvedValueOnce(null);

    await expect(saveReportCsv(report, reportLabels, "report.csv")).resolves.toBe("cancelled");
    expect(tauriMocks.writeTextFile).not.toHaveBeenCalled();
  });

  test("propagates report dialog and write failures without a false saved result", async () => {
    tauriMocks.save.mockRejectedValueOnce(new Error("dialog failed"));
    await expect(saveReportCsv(report, reportLabels, "report.csv")).rejects.toThrow("dialog failed");
    expect(tauriMocks.writeTextFile).not.toHaveBeenCalled();

    tauriMocks.save.mockResolvedValueOnce("C:\\exports\\report.csv");
    tauriMocks.writeTextFile.mockRejectedValueOnce(new Error("write failed"));
    await expect(saveReportCsv(report, reportLabels, "report.csv")).rejects.toThrow("write failed");
  });

  test("prevents a second native save while the first dialog is pending", async () => {
    const pendingDialog = deferred<string | null>();
    tauriMocks.save.mockReturnValueOnce(pendingDialog.promise);

    const firstSave = saveCsvFile("first", "first.csv");
    await expect(saveCsvFile("second", "second.csv")).resolves.toBe("busy");
    expect(tauriMocks.save).toHaveBeenCalledOnce();

    pendingDialog.resolve(null);
    await expect(firstSave).resolves.toBe("cancelled");
    expect(tauriMocks.writeTextFile).not.toHaveBeenCalled();
  });

  test("uses the real sales export flow and preserves generated CSV content", async () => {
    salesMocks.listSales.mockResolvedValueOnce({ ok: true, data: [sale] });
    tauriMocks.save.mockResolvedValueOnce("C:\\exports\\sales.csv");
    tauriMocks.writeTextFile.mockResolvedValueOnce(undefined);

    await expect(exportSalesHistory(salesLabels, "sales.csv")).resolves.toEqual({
      ok: true,
      status: "saved",
    });
    expect(tauriMocks.writeTextFile).toHaveBeenCalledWith(
      "C:\\exports\\sales.csv",
      createSalesCsv([sale], salesLabels),
    );
  });

  test("handles sales cancellation and native failures without writing or false success", async () => {
    salesMocks.listSales.mockResolvedValue({ ok: true, data: [sale] });
    tauriMocks.save.mockResolvedValueOnce(null);
    await expect(exportSalesHistory(salesLabels, "sales.csv")).resolves.toEqual({
      ok: true,
      status: "cancelled",
    });
    expect(tauriMocks.writeTextFile).not.toHaveBeenCalled();

    tauriMocks.save.mockRejectedValueOnce(new Error("dialog failed"));
    await expect(exportSalesHistory(salesLabels, "sales.csv")).resolves.toEqual({
      ok: false,
      error: "file_error",
    });

    tauriMocks.save.mockResolvedValueOnce("C:\\exports\\sales.csv");
    tauriMocks.writeTextFile.mockRejectedValueOnce(new Error("write failed"));
    await expect(exportSalesHistory(salesLabels, "sales.csv")).resolves.toEqual({
      ok: false,
      error: "file_error",
    });
  });
});
