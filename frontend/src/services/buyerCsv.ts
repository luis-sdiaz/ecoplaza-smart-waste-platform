import type { Buyer } from "./buyerService";
import {
  createCsvRow,
  createUtf8Csv,
  saveCsvFile,
  type CsvExportLanguage,
  type SaveCsvResult,
} from "./csvService.ts";

export interface BuyerCsvLabels {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export function createBuyerCsv(
  buyers: ReadonlyArray<Buyer>,
  labels: BuyerCsvLabels,
  language: CsvExportLanguage,
): string {
  return createUtf8Csv([
    createCsvRow([labels.id, labels.name, labels.email, labels.phone], language),
    ...buyers.map((buyer) => createCsvRow([
      buyer.id,
      buyer.name,
      buyer.email ?? "",
      buyer.phone ?? "",
    ], language)),
  ]);
}

export function saveBuyerCsv(
  buyers: ReadonlyArray<Buyer>,
  labels: BuyerCsvLabels,
  language: CsvExportLanguage,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  return saveCsvFile(createBuyerCsv(buyers, labels, language), defaultFileName);
}
