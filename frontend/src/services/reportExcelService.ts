import type { Worksheet } from "exceljs";
import type { ReportStatistics } from "./reportService.ts";
import type { ReportDateRange } from "./reportDateRange.ts";
import type { WasteCategory } from "./wasteService.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";

export interface ReportExcelLabels {
  workbookTitle: string;
  summarySheet: string;
  distributionSheet: string;
  performanceSheet: string;
  trendSheet: string;
  metric: string;
  value: string;
  unit: string;
  category: string;
  weight: string;
  percentage: string;
  sales: string;
  grossRevenue: string;
  date: string;
  records: string;
  historicalWeight: string;
  availableWeight: string;
  soldWeight: string;
  period: string;
  from: string;
  to: string;
  allTime: string;
  countUnit: string;
  kilogramsUnit: string;
  copUnit: string;
  categories: Record<WasteCategory, string>;
}

const TITLE_FILL = "FF166534";
const HEADER_FILL = "FF15803D";
const WHITE = "FFFFFFFF";
const BORDER = "FFD1D5DB";

function safeText(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function validNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Report contains an invalid numeric value.");
  }
  return value;
}

function parseExcelDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) throw new Error("Report contains an invalid date.");
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error("Report contains an invalid date.");
  }
  return date;
}

function styleWorksheet(
  worksheet: Worksheet,
  title: string,
  headers: readonly string[],
  widths: readonly number[],
): void {
  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = safeText(title);
  titleCell.font = { bold: true, color: { argb: WHITE }, size: 15 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 26;

  const headerRow = worksheet.getRow(3);
  headerRow.values = [...headers.map(safeText)];
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
  });

  worksheet.columns = widths.map((width) => ({ width }));
  worksheet.views = [{ state: "frozen", ySplit: 3, topLeftCell: "A4" }];
  worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
}

function styleBody(worksheet: Worksheet): void {
  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
      cell.alignment = { vertical: "middle" };
    });
  }
}

export async function createReportExcel(
  statistics: ReportStatistics,
  labels: ReportExcelLabels,
  dateRange?: ReportDateRange,
): Promise<Uint8Array> {
  const excelModule = await import("exceljs");
  const Workbook = excelModule.Workbook ??
    (excelModule as unknown as { default: typeof excelModule }).default.Workbook;
  const workbook = new Workbook();
  workbook.creator = "EcoPlaza";
  workbook.company = "EcoPlaza";
  workbook.subject = safeText(labels.workbookTitle);
  workbook.created = new Date();

  const summary = workbook.addWorksheet(safeText(labels.summarySheet));
  styleWorksheet(summary, labels.workbookTitle, [labels.metric, labels.value, labels.unit], [31, 20, 16]);
  if (dateRange === undefined) {
    summary.addRow([safeText(labels.period), safeText(labels.allTime), ""]);
  } else {
    const fromRow = summary.addRow([safeText(labels.from), parseExcelDate(dateRange.startDate), ""]);
    const toRow = summary.addRow([safeText(labels.to), parseExcelDate(dateRange.endDate), ""]);
    fromRow.getCell(2).numFmt = "yyyy-mm-dd";
    toRow.getCell(2).numFmt = "yyyy-mm-dd";
  }
  summary.addRow([safeText(labels.records), validNumber(statistics.wasteRecordCount), safeText(labels.countUnit)]);
  const historicalRow = summary.addRow([safeText(labels.historicalWeight), validNumber(statistics.totalRegisteredWeightKg), safeText(labels.kilogramsUnit)]);
  const availableRow = summary.addRow([safeText(labels.availableWeight), validNumber(statistics.availableWeightKg), safeText(labels.kilogramsUnit)]);
  const soldRow = summary.addRow([safeText(labels.soldWeight), validNumber(statistics.soldWeightKg), safeText(labels.kilogramsUnit)]);
  summary.addRow([safeText(labels.sales), validNumber(statistics.salesCount), safeText(labels.countUnit)]);
  const revenueRow = summary.addRow([safeText(labels.grossRevenue), validNumber(statistics.grossSalesValue), safeText(labels.copUnit)]);
  historicalRow.getCell(2).numFmt = '0.000 "kg"';
  availableRow.getCell(2).numFmt = '0.000 "kg"';
  soldRow.getCell(2).numFmt = '0.000 "kg"';
  revenueRow.getCell(2).numFmt = '"COP" #,##0.00';
  styleBody(summary);

  const distribution = workbook.addWorksheet(safeText(labels.distributionSheet));
  styleWorksheet(distribution, labels.distributionSheet, [labels.category, labels.weight, labels.percentage], [25, 20, 18]);
  for (const item of statistics.distribution) {
    distribution.addRow([
      safeText(labels.categories[item.category]),
      validNumber(item.weightKg),
      validNumber(item.percentage) / 100,
    ]);
  }
  distribution.getColumn(2).numFmt = '0.000 "kg"';
  distribution.getColumn(3).numFmt = "0.00%";
  styleBody(distribution);

  const performance = workbook.addWorksheet(safeText(labels.performanceSheet));
  styleWorksheet(performance, labels.performanceSheet, [labels.category, labels.sales, labels.soldWeight, labels.grossRevenue], [25, 14, 20, 22]);
  for (const item of statistics.salesByCategory) {
    performance.addRow([
      safeText(labels.categories[item.category]),
      validNumber(item.salesCount),
      validNumber(item.soldWeightKg),
      validNumber(item.grossSalesValue),
    ]);
  }
  performance.getColumn(2).numFmt = "0";
  performance.getColumn(3).numFmt = '0.000 "kg"';
  performance.getColumn(4).numFmt = '"COP" #,##0.00';
  styleBody(performance);

  const trend = workbook.addWorksheet(safeText(labels.trendSheet));
  styleWorksheet(trend, labels.trendSheet, [labels.date, labels.sales, labels.grossRevenue], [18, 14, 22]);
  for (const item of statistics.salesTrend) {
    trend.addRow([
      parseExcelDate(item.date),
      validNumber(item.salesCount),
      validNumber(item.grossSalesValue),
    ]);
  }
  trend.getColumn(1).numFmt = "yyyy-mm-dd";
  trend.getColumn(2).numFmt = "0";
  trend.getColumn(3).numFmt = '"COP" #,##0.00';
  styleBody(trend);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveReportExcel(
  statistics: ReportStatistics,
  labels: ReportExcelLabels,
  defaultFileName: string,
  dateRange?: ReportDateRange,
): Promise<SaveExcelResult> {
  return saveExcelFile(
    () => createReportExcel(statistics, labels, dateRange),
    defaultFileName,
  );
}
