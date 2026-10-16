import type { RemoteWasteRecord, WasteCategory, WasteStatus } from "./wasteService";
import { createCsvRow, createUtf8Csv, saveCsvFile, type CsvExportLanguage, type SaveCsvResult } from "./csvService.ts";

export interface WasteCsvLabels {
  recordNumber: string;
  id: string;
  category: string;
  weightKg: string;
  container: string;
  registeredAt: string;
  status: string;
  categories: Record<WasteCategory, string>;
  statuses: Record<WasteStatus, string>;
}

export function createWasteCsv(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: WasteCsvLabels,
  language: CsvExportLanguage,
): string {
  return createUtf8Csv([
    createCsvRow([labels.recordNumber, labels.id, labels.category, labels.weightKg, labels.container, labels.registeredAt, labels.status], language),
    ...records.map((record) => createCsvRow([
      record.recordNumber,
      record.id,
      labels.categories[record.category],
      record.weightKg,
      containerCodes.get(record.containerId) ?? "",
      record.registeredAt,
      labels.statuses[record.status],
    ], language)),
  ]);
}

export function saveWasteCsv(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: WasteCsvLabels,
  language: CsvExportLanguage,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  return saveCsvFile(createWasteCsv(records, containerCodes, labels, language), defaultFileName);
}
