import type { ReportStatistics } from "./reportService";
import type { WasteCategory } from "./wasteService";
import type { ReportDateRange } from "./reportDateRange";
import {
  createCsvRow,
  createUtf8Csv,
  saveCsvFile,
  type CsvExportLanguage,
} from "./csvService.ts";

export { escapeCsvValue } from "./csvService.ts";

export interface ReportCsvLabels {
  section: string;
  metric: string;
  value: string;
  unit: string;
  summary: string;
  distribution: string;
  salesPerformance: string;
  salesTrend: string;
  date: string;
  category: string;
  weight: string;
  percentage: string;
  records: string;
  historicalWeight: string;
  availableWeight: string;
  soldWeight: string;
  sales: string;
  grossRevenue: string;
  countUnit: string;
  kilogramsUnit: string;
  copUnit: string;
  period: string;
  from: string;
  to: string;
  allTime: string;
  categories: Record<WasteCategory, string>;
}

export type SaveReportCsvResult = "saved" | "cancelled" | "busy";

function validNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Report contains an invalid numeric value.");
  }
  return value;
}

export function createReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
  language: CsvExportLanguage,
  dateRange?: ReportDateRange,
): string {
  const rows = [
    createCsvRow([labels.section, labels.metric, labels.value, labels.unit], language),
    ...(dateRange === undefined
      ? [createCsvRow([labels.period, labels.allTime, "", ""], language)]
      : [
          createCsvRow([labels.period, labels.from, dateRange.startDate, ""], language),
          createCsvRow([labels.period, labels.to, dateRange.endDate, ""], language),
        ]),
    createCsvRow([labels.summary, labels.records, validNumber(statistics.wasteRecordCount), labels.countUnit], language),
    createCsvRow([labels.summary, labels.historicalWeight, validNumber(statistics.totalRegisteredWeightKg), labels.kilogramsUnit], language),
    createCsvRow([labels.summary, labels.availableWeight, validNumber(statistics.availableWeightKg), labels.kilogramsUnit], language),
    createCsvRow([labels.summary, labels.soldWeight, validNumber(statistics.soldWeightKg), labels.kilogramsUnit], language),
    createCsvRow([labels.summary, labels.sales, validNumber(statistics.salesCount), labels.countUnit], language),
    createCsvRow([labels.summary, labels.grossRevenue, validNumber(statistics.grossSalesValue), labels.copUnit], language),
    "",
    createCsvRow([labels.distribution, labels.category, labels.weight, labels.percentage], language),
    ...statistics.distribution.map((item) =>
      createCsvRow([
        labels.distribution,
        labels.categories[item.category],
        validNumber(item.weightKg),
        validNumber(item.percentage),
      ], language),
    ),
    "",
    createCsvRow([
      labels.salesPerformance,
      labels.category,
      labels.sales,
      labels.soldWeight,
      labels.grossRevenue,
    ], language),
    ...statistics.salesByCategory.map((item) => createCsvRow([
      labels.salesPerformance,
      labels.categories[item.category],
      validNumber(item.salesCount),
      validNumber(item.soldWeightKg),
      validNumber(item.grossSalesValue),
    ], language)),
    "",
    createCsvRow([labels.salesTrend, labels.date, labels.sales, labels.grossRevenue], language),
    ...statistics.salesTrend.map((item) => createCsvRow([
      labels.salesTrend,
      item.date,
      validNumber(item.salesCount),
      validNumber(item.grossSalesValue),
    ], language)),
  ];

  return createUtf8Csv(rows);
}

export async function saveReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
  defaultFileName: string,
  language: CsvExportLanguage,
  dateRange?: ReportDateRange,
): Promise<SaveReportCsvResult> {
  return saveCsvFile(
    createReportCsv(statistics, labels, language, dateRange),
    defaultFileName,
  );
}
