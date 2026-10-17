import type { SaleHistoryItem } from "./salesService.ts";
import type { WasteCategory } from "./wasteService.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

export interface BuyerPurchaseExcelLabels {
  workbookTitle: string;
  sheetName: string;
  saleId: string;
  soldAt: string;
  category: string;
  weightKg: string;
  unitPriceCop: string;
  totalValueCop: string;
  categories: Record<WasteCategory, string>;
}

export async function createBuyerPurchaseExcel(
  sales: ReadonlyArray<SaleHistoryItem>,
  buyerId: string,
  labels: BuyerPurchaseExcelLabels,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [labels.saleId, labels.soldAt, labels.category, labels.weightKg, labels.unitPriceCop, labels.totalValueCop],
    [40, 22, 24, 20, 22, 22],
  );

  for (const sale of sales.filter((item) => item.buyerId === buyerId)) {
    worksheet.addRow([
      safeExcelText(sale.id),
      parseExcelTimestamp(sale.soldAt, timeZone),
      safeExcelText(labels.categories[sale.category]),
      validExcelNumber(sale.weightKg, "Buyer purchase"),
      validExcelNumber(sale.unitPrice, "Buyer purchase"),
      validExcelNumber(sale.totalValue, "Buyer purchase"),
    ]);
  }

  worksheet.getColumn(2).numFmt = "yyyy-mm-dd hh:mm";
  worksheet.getColumn(4).numFmt = '0.000 "kg"';
  worksheet.getColumn(5).numFmt = '"COP" #,##0.00';
  worksheet.getColumn(6).numFmt = '"COP" #,##0.00';
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveBuyerPurchaseExcel(
  sales: ReadonlyArray<SaleHistoryItem>,
  buyerId: string,
  labels: BuyerPurchaseExcelLabels,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  return saveExcelFile(
    () => createBuyerPurchaseExcel(sales, buyerId, labels),
    defaultFileName,
  );
}
