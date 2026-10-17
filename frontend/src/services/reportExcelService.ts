import type { ReportStatistics } from "./reportService.ts";
import type { ReportDateRange } from "./reportDateRange.ts";
import type { WasteCategory } from "./wasteService.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelDate,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

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

export async function createReportExcel(
  statistics: ReportStatistics,
  labels: ReportExcelLabels,
  dateRange?: ReportDateRange,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);

  const summary = workbook.addWorksheet(safeExcelText(labels.summarySheet));
  styleExcelWorksheet(summary, labels.workbookTitle, [labels.metric, labels.value, labels.unit], [31, 20, 16]);
  if (dateRange === undefined) {
    summary.addRow([safeExcelText(labels.period), safeExcelText(labels.allTime), ""]);
  } else {
    const fromRow = summary.addRow([safeExcelText(labels.from), parseExcelDate(dateRange.startDate), ""]);
    const toRow = summary.addRow([safeExcelText(labels.to), parseExcelDate(dateRange.endDate), ""]);
    fromRow.getCell(2).numFmt = "yyyy-mm-dd";
    toRow.getCell(2).numFmt = "yyyy-mm-dd";
  }
  summary.addRow([safeExcelText(labels.records), validExcelNumber(statistics.wasteRecordCount, "Report"), safeExcelText(labels.countUnit)]);
  const historicalRow = summary.addRow([safeExcelText(labels.historicalWeight), validExcelNumber(statistics.totalRegisteredWeightKg, "Report"), safeExcelText(labels.kilogramsUnit)]);
  const availableRow = summary.addRow([safeExcelText(labels.availableWeight), validExcelNumber(statistics.availableWeightKg, "Report"), safeExcelText(labels.kilogramsUnit)]);
  const soldRow = summary.addRow([safeExcelText(labels.soldWeight), validExcelNumber(statistics.soldWeightKg, "Report"), safeExcelText(labels.kilogramsUnit)]);
  summary.addRow([safeExcelText(labels.sales), validExcelNumber(statistics.salesCount, "Report"), safeExcelText(labels.countUnit)]);
  const revenueRow = summary.addRow([safeExcelText(labels.grossRevenue), validExcelNumber(statistics.grossSalesValue, "Report"), safeExcelText(labels.copUnit)]);
  historicalRow.getCell(2).numFmt = '0.000 "kg"';
  availableRow.getCell(2).numFmt = '0.000 "kg"';
  soldRow.getCell(2).numFmt = '0.000 "kg"';
  revenueRow.getCell(2).numFmt = '"COP" #,##0.00';
  styleExcelBody(summary);

  const distribution = workbook.addWorksheet(safeExcelText(labels.distributionSheet));
  styleExcelWorksheet(distribution, labels.distributionSheet, [labels.category, labels.weight, labels.percentage], [25, 20, 18]);
  for (const item of statistics.distribution) {
    distribution.addRow([
      safeExcelText(labels.categories[item.category]),
      validExcelNumber(item.weightKg, "Report"),
      validExcelNumber(item.percentage, "Report") / 100,
    ]);
  }
  distribution.getColumn(2).numFmt = '0.000 "kg"';
  distribution.getColumn(3).numFmt = "0.00%";
  styleExcelBody(distribution);

  const performance = workbook.addWorksheet(safeExcelText(labels.performanceSheet));
  styleExcelWorksheet(performance, labels.performanceSheet, [labels.category, labels.sales, labels.soldWeight, labels.grossRevenue], [25, 14, 20, 22]);
  for (const item of statistics.salesByCategory) {
    performance.addRow([
      safeExcelText(labels.categories[item.category]),
      validExcelNumber(item.salesCount, "Report"),
      validExcelNumber(item.soldWeightKg, "Report"),
      validExcelNumber(item.grossSalesValue, "Report"),
    ]);
  }
  performance.getColumn(2).numFmt = "0";
  performance.getColumn(3).numFmt = '0.000 "kg"';
  performance.getColumn(4).numFmt = '"COP" #,##0.00';
  styleExcelBody(performance);

  const trend = workbook.addWorksheet(safeExcelText(labels.trendSheet));
  styleExcelWorksheet(trend, labels.trendSheet, [labels.date, labels.sales, labels.grossRevenue], [18, 14, 22]);
  for (const item of statistics.salesTrend) {
    trend.addRow([
      parseExcelDate(item.date),
      validExcelNumber(item.salesCount, "Report"),
      validExcelNumber(item.grossSalesValue, "Report"),
    ]);
  }
  trend.getColumn(1).numFmt = "yyyy-mm-dd";
  trend.getColumn(2).numFmt = "0";
  trend.getColumn(3).numFmt = '"COP" #,##0.00';
  styleExcelBody(trend);

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
