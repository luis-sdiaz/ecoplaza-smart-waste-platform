import { saveCsvFile, type CsvExportLanguage, type SaveCsvResult } from "./csvService.ts";
import { createSalesCsv, type SalesCsvLabels } from "./salesCsv.ts";
import type { SaleHistoryItem } from "./salesService";

export function createBuyerPurchaseCsv(
  sales: ReadonlyArray<SaleHistoryItem>,
  buyerId: string,
  labels: SalesCsvLabels,
  language: CsvExportLanguage,
): string {
  return createSalesCsv(sales.filter((sale) => sale.buyerId === buyerId), labels, language);
}

export function saveBuyerPurchaseCsv(
  sales: ReadonlyArray<SaleHistoryItem>,
  buyerId: string,
  labels: SalesCsvLabels,
  language: CsvExportLanguage,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  return saveCsvFile(createBuyerPurchaseCsv(sales, buyerId, labels, language), defaultFileName);
}
