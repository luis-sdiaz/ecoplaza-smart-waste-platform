import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ReportStatistics } from "./reportService";
import type { WasteCategory } from "./wasteService";

const CSV_SEPARATOR = ";";
const FORMULA_PREFIX_PATTERN = /^[\t\r ]*[=+\-@]/;

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
  categories: Record<WasteCategory, string>;
}

export type SaveReportCsvResult = "saved" | "cancelled";

function protectCsvFormula(value: string): string {
  return FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function escapeCsvValue(value: string | number): string {
  const safeValue = protectCsvFormula(String(value));
  return /[;"\r\n]/.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

function csvRow(values: ReadonlyArray<string | number>): string {
  return values.map(escapeCsvValue).join(CSV_SEPARATOR);
}

function validNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Report contains an invalid numeric value.");
  }
  return value;
}

export function createReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
): string {
  const rows = [
    csvRow([labels.section, labels.metric, labels.value, labels.unit]),
    csvRow([labels.summary, labels.records, validNumber(statistics.wasteRecordCount), labels.countUnit]),
    csvRow([labels.summary, labels.historicalWeight, validNumber(statistics.totalRegisteredWeightKg), labels.kilogramsUnit]),
    csvRow([labels.summary, labels.availableWeight, validNumber(statistics.availableWeightKg), labels.kilogramsUnit]),
    csvRow([labels.summary, labels.soldWeight, validNumber(statistics.soldWeightKg), labels.kilogramsUnit]),
    csvRow([labels.summary, labels.sales, validNumber(statistics.salesCount), labels.countUnit]),
    csvRow([labels.summary, labels.grossRevenue, validNumber(statistics.grossSalesValue), labels.copUnit]),
    "",
    csvRow([labels.distribution, labels.category, labels.weight, labels.percentage]),
    ...statistics.distribution.map((item) =>
      csvRow([
        labels.distribution,
        labels.categories[item.category],
        validNumber(item.weightKg),
        validNumber(item.percentage),
      ]),
    ),
  ];

  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export async function saveReportCsv(
  statistics: ReportStatistics,
  labels: ReportCsvLabels,
  defaultFileName: string,
): Promise<SaveReportCsvResult> {
  const filePath = await save({
    defaultPath: defaultFileName,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (filePath === null) return "cancelled";

  await writeTextFile(filePath, createReportCsv(statistics, labels));
  return "saved";
}
