import type { RemoteWasteRecord, WasteCategory } from "./wasteService";
import { createCsvRow, createUtf8Csv, saveCsvFile, type CsvExportLanguage, type SaveCsvResult } from "./csvService.ts";

export interface InventoryCsvLabels {
  recordNumber: string;
  container: string;
  category: string;
  weightKg: string;
  registeredAt: string;
  categories: Record<WasteCategory, string>;
}

export function createInventoryCsv(records: ReadonlyArray<RemoteWasteRecord>, containerCodes: ReadonlyMap<string, string>, labels: InventoryCsvLabels, language: CsvExportLanguage): string {
  return createUtf8Csv([
    createCsvRow([labels.recordNumber, labels.container, labels.category, labels.weightKg, labels.registeredAt], language),
    ...records.map((record) => createCsvRow([record.recordNumber, containerCodes.get(record.containerId) ?? "", labels.categories[record.category], record.weightKg, record.registeredAt], language)),
  ]);
}

export function saveInventoryCsv(records: ReadonlyArray<RemoteWasteRecord>, containerCodes: ReadonlyMap<string, string>, labels: InventoryCsvLabels, language: CsvExportLanguage, defaultFileName: string): Promise<SaveCsvResult> {
  return saveCsvFile(createInventoryCsv(records, containerCodes, labels, language), defaultFileName);
}
