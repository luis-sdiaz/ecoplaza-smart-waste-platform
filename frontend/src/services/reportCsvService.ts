import type { ReportStatistics } from "./reportService";
import type { WasteCategory } from "./wasteService";
import type { ReportDateRange } from "./reportDateRange";
import {
  createCsvRow,
  createUtf8Csv,
  saveCsvFile,
} from "./csvService.ts";

export { escapeCsvValue } from "./csvService.ts";

export interface ReportCsvLabels {
  section: string;
  metric: string;
  value: string;
  unit: string;
  summary: string;
  distribution: string;
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

export type SaveReportCsvResult = "saved" | "cancelled";

function validNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Report contains an invalid numeric value.");
  }
  return value;
}

export function createReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
  dateRange?: ReportDateRange,
): string {
  const rows = [
    createCsvRow([labels.section, labels.metric, labels.value, labels.unit]),
    createCsvRow([
      labels.period,
      dateRange === undefined ? labels.allTime : labels.from,
      dateRange === undefined ? "" : dateRange.startDate,
      dateRange === undefined ? "" : `${labels.to}: ${dateRange.endDate}`,
    ]),
    createCsvRow([labels.summary, labels.records, validNumber(statistics.wasteRecordCount), labels.countUnit]),
    createCsvRow([labels.summary, labels.historicalWeight, validNumber(statistics.totalRegisteredWeightKg), labels.kilogramsUnit]),
    createCsvRow([labels.summary, labels.availableWeight, validNumber(statistics.availableWeightKg), labels.kilogramsUnit]),
    createCsvRow([labels.summary, labels.soldWeight, validNumber(statistics.soldWeightKg), labels.kilogramsUnit]),
    createCsvRow([labels.summary, labels.sales, validNumber(statistics.salesCount), labels.countUnit]),
    createCsvRow([labels.summary, labels.grossRevenue, validNumber(statistics.grossSalesValue), labels.copUnit]),
    "",
    createCsvRow([labels.distribution, labels.category, labels.weight, labels.percentage]),
    ...statistics.distribution.map((item) =>
      createCsvRow([
        labels.distribution,
        labels.categories[item.category],
        validNumber(item.weightKg),
        validNumber(item.percentage),
      ]),
    ),
  ];

  return createUtf8Csv(rows);
}

export async function saveReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
  defaultFileName: string,
  dateRange?: ReportDateRange,
): Promise<SaveReportCsvResult> {
  return saveCsvFile(
    createReportCsv(statistics, labels, dateRange),
    defaultFileName,
  );
}
