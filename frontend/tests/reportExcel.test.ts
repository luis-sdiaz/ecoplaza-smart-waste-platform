import assert from "node:assert/strict";
import test from "node:test";
import { createReportExcel, type ReportExcelLabels } from "../src/services/reportExcelService.ts";
import { createSalesExcel, type SalesExcelLabels } from "../src/services/salesExcelService.ts";

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
  monthlySheet: "Monthly summary",
  metric: "Metric", value: "Value", unit: "Unit", category: "Category",
  weight: "Weight", percentage: "Percentage", sales: "Sales",
  grossRevenue: "Gross revenue", date: "Date", records: "Records",
  averagePricePerKg: "Average price (COP/kg)",
  month: "Month", averagePerOperation: "Average per operation",
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
    { category: "organic" as const, salesCount: 1, soldWeightKg: 4.625, grossSalesValue: 1000.25, averagePricePerKg: 216.27027 },
    { category: "recyclable" as const, salesCount: 1, soldWeightKg: 20, grossSalesValue: 2000.5, averagePricePerKg: 100.025 },
    { category: "nonRecyclable" as const, salesCount: 0, soldWeightKg: 0, grossSalesValue: 0, averagePricePerKg: 0 },
  ],
  salesTrend: [
    { date: "2026-10-13", salesCount: 1, grossSalesValue: 1000.25 },
    { date: "2026-10-14", salesCount: 1, grossSalesValue: 2000.5 },
  ],
  monthlySales: [
    { month: "2026-09", salesCount: 0, grossSalesValue: 0, averageSaleValue: 0 },
    { month: "2026-10", salesCount: 2, grossSalesValue: 3000.75, averageSaleValue: 1500.375 },
  ],
};

const salesLabels: SalesExcelLabels = {
  workbookTitle: "EcoPlaza completed sales",
  sheetName: "Completed sales",
  saleId: "Sale ID",
  buyer: "Buyer",
  date: "Completion date",
  category: "Category",
  weightKg: "Weight (kg)",
  unitPriceCop: "Unit price (COP)",
  totalValueCop: "Total value (COP)",
  categories: { organic: "Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
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
    "Summary", "Waste distribution", "Sales performance", "Daily sales", "Monthly summary",
  ]);

  const summary = reopened.getWorksheet("Summary")!;
  assert.ok(summary.getCell("B4").value instanceof Date);
  assert.ok(summary.getCell("B5").value instanceof Date);
  assert.equal(summary.getCell("B6").value, 3);
  assert.equal(summary.getCell("B7").value, 35.125);
  assert.equal(summary.getCell("B7").numFmt, "0.000");
  assert.equal(summary.getCell("C7").value, "kg");
  assert.equal(summary.getCell("B11").value, 3000.75);
  assert.equal(summary.getCell("B11").numFmt, "#,##0.00");
  assert.equal(summary.getCell("C11").value, "COP");
  assert.doesNotMatch(summary.getCell("B7").numFmt, /kg/i);
  assert.doesNotMatch(summary.getCell("B11").numFmt, /COP/i);
  assert.equal(summary.views[0]?.state, "frozen");
  assert.ok(summary.autoFilter);
  assert.equal(summary.getCell("A3").fill.type, "pattern");
  assert.equal(summary.getRow(3).height, 34);
  assert.equal(summary.getCell("A3").alignment.wrapText, true);
  assert.equal(summary.getCell("A3").alignment.horizontal, "center");
  assert.ok((summary.getColumn(1).width ?? 0) >= 31);

  const distribution = reopened.getWorksheet("Waste distribution")!;
  assert.equal(distribution.getCell("A4").value, "'=Organic");
  assert.equal(distribution.getCell("B4").value, 10.5);
  assert.equal(distribution.getCell("C4").value, 0.3);
  assert.equal(distribution.getCell("C4").numFmt, "0.00%");

  const performance = reopened.getWorksheet("Sales performance")!;
  assert.equal(performance.getCell("D4").value, 1000.25);
  assert.match(performance.getCell("D4").numFmt, /COP/);
  assert.equal(performance.getCell("E4").value, 216.27027);
  assert.match(performance.getCell("E4").numFmt, /COP/);
  assert.ok((performance.getColumn(3).width ?? 0) >= 20);

  const trend = reopened.getWorksheet("Daily sales")!;
  assert.ok(trend.getCell("A4").value instanceof Date);
  assert.equal(trend.getCell("A4").numFmt, "yyyy-mm-dd");
  assert.equal(trend.getCell("C5").value, 2000.5);

  const monthly = reopened.getWorksheet("Monthly summary")!;
  assert.ok(monthly.getCell("A4").value instanceof Date);
  assert.equal(monthly.getCell("A4").numFmt, "mmmm yyyy");
  assert.equal(monthly.getCell("B4").value, 0);
  assert.equal(monthly.getCell("C5").value, 3000.75);
  assert.equal(monthly.getCell("D5").value, 1500.375);
  assert.match(monthly.getCell("D5").numFmt, /COP/);

  for (const worksheet of reopened.worksheets) {
    assert.equal(worksheet.getRow(3).height, 34);
    worksheet.getRow(3).eachCell((cell) => {
      assert.equal(cell.alignment.wrapText, true);
      assert.equal(cell.font.bold, true);
      assert.equal(cell.fill.type, "pattern");
    });
  }
});

test("rejects invalid report values instead of emitting a misleading workbook", async () => {
  await assert.rejects(() => createReportExcel({ ...statistics, grossSalesValue: Number.NaN }, labels));
  await assert.rejects(() => createReportExcel({
    ...statistics,
    salesTrend: [{ date: "2026-02-30", salesCount: 1, grossSalesValue: 1 }],
  }, labels));
});

test("exports sale timestamps as Bogota wall-clock dates without a duplicate conversion", async () => {
  const baseSale = {
    id: "11111111-1111-4111-8111-111111111111",
    buyerId: "22222222-2222-4222-8222-222222222222",
    wasteRecordId: "33333333-3333-4333-8333-333333333333",
    weightKg: 2.5,
    unitPrice: 1200,
    totalValue: 3000,
    buyerName: "Buyer",
    wasteRecordNumber: "1",
    category: "organic" as const,
  };
  const bytes = await createSalesExcel([
    { ...baseSale, soldAt: "2026-10-18T02:30:00.000Z" },
    {
      ...baseSale,
      id: "44444444-4444-4444-8444-444444444444",
      soldAt: "2026-10-17T21:30:00.000-05:00",
    },
  ], salesLabels, "America/Bogota");

  const reopened = new Workbook();
  await reopened.xlsx.load(Buffer.from(bytes));
  const worksheet = reopened.getWorksheet("Completed sales")!;
  const utcSourceCell = worksheet.getCell("C4");
  const offsetSourceCell = worksheet.getCell("C5");

  assert.ok(utcSourceCell.value instanceof Date);
  assert.ok(offsetSourceCell.value instanceof Date);
  assert.equal(utcSourceCell.value.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(offsetSourceCell.value.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(utcSourceCell.numFmt, "yyyy-mm-dd hh:mm");
});
