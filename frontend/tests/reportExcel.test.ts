import assert from "node:assert/strict";
import test from "node:test";
import { createReportExcel, type ReportExcelLabels } from "../src/services/reportExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: ReportExcelLabels = {
  workbookTitle: "EcoPlaza analytics report",
  summarySheet: "Summary",
  distributionSheet: "Waste distribution",
  performanceSheet: "Sales performance",
  trendSheet: "Daily sales",
  metric: "Metric", value: "Value", unit: "Unit", category: "Category",
  weight: "Weight", percentage: "Percentage", sales: "Sales",
  grossRevenue: "Gross revenue", date: "Date", records: "Records",
  historicalWeight: "Historical weight", availableWeight: "Available weight",
  soldWeight: "Sold weight", period: "Period", from: "From", to: "To",
  allTime: "All history", countUnit: "records", kilogramsUnit: "kg", copUnit: "COP",
  categories: { organic: "=Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
};

const statistics = {
  wasteRecordCount: 3,
  totalRegisteredWeightKg: 35.125,
  availableWeightKg: 10.5,
  soldWeightKg: 24.625,
  salesCount: 2,
  grossSalesValue: 3000.75,
  distribution: [
    { category: "organic" as const, weightKg: 10.5, percentage: 30 },
    { category: "recyclable" as const, weightKg: 20, percentage: 57.142857 },
    { category: "nonRecyclable" as const, weightKg: 4.625, percentage: 12.857143 },
  ],
  salesByCategory: [
    { category: "organic" as const, salesCount: 1, soldWeightKg: 4.625, grossSalesValue: 1000.25 },
    { category: "recyclable" as const, salesCount: 1, soldWeightKg: 20, grossSalesValue: 2000.5 },
    { category: "nonRecyclable" as const, salesCount: 0, soldWeightKg: 0, grossSalesValue: 0 },
  ],
  salesTrend: [
    { date: "2026-10-13", salesCount: 1, grossSalesValue: 1000.25 },
    { date: "2026-10-14", salesCount: 1, grossSalesValue: 2000.5 },
  ],
};

test("creates a valid formatted analytics workbook with real Excel value types", async () => {
  const bytes = await createReportExcel(
    statistics,
    labels,
    { startDate: "2026-10-01", endDate: "2026-10-14" },
  );
  assert.ok(bytes.byteLength > 0);

  const reopened = new Workbook();
  await reopened.xlsx.load(Buffer.from(bytes));
  assert.deepEqual(reopened.worksheets.map(({ name }) => name), [
    "Summary", "Waste distribution", "Sales performance", "Daily sales",
  ]);

  const summary = reopened.getWorksheet("Summary")!;
  assert.ok(summary.getCell("B4").value instanceof Date);
  assert.ok(summary.getCell("B5").value instanceof Date);
  assert.equal(summary.getCell("B6").value, 3);
  assert.equal(summary.getCell("B7").value, 35.125);
  assert.equal(summary.getCell("B11").value, 3000.75);
  assert.match(summary.getCell("B11").numFmt, /COP/);
  assert.equal(summary.views[0]?.state, "frozen");
  assert.ok(summary.autoFilter);
  assert.equal(summary.getCell("A3").fill.type, "pattern");

  const distribution = reopened.getWorksheet("Waste distribution")!;
  assert.equal(distribution.getCell("A4").value, "'=Organic");
  assert.equal(distribution.getCell("B4").value, 10.5);
  assert.equal(distribution.getCell("C4").value, 0.3);
  assert.equal(distribution.getCell("C4").numFmt, "0.00%");

  const performance = reopened.getWorksheet("Sales performance")!;
  assert.equal(performance.getCell("D4").value, 1000.25);
  assert.match(performance.getCell("D4").numFmt, /COP/);

  const trend = reopened.getWorksheet("Daily sales")!;
  assert.ok(trend.getCell("A4").value instanceof Date);
  assert.equal(trend.getCell("A4").numFmt, "yyyy-mm-dd");
  assert.equal(trend.getCell("C5").value, 2000.5);
});

test("rejects invalid report values instead of emitting a misleading workbook", async () => {
  await assert.rejects(() => createReportExcel({ ...statistics, grossSalesValue: Number.NaN }, labels));
  await assert.rejects(() => createReportExcel({
    ...statistics,
    salesTrend: [{ date: "2026-02-30", salesCount: 1, grossSalesValue: 1 }],
  }, labels));
});
