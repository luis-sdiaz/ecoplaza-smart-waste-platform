import type { Buyer } from "./buyerService.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
} from "./excelWorkbook.ts";

export interface BuyerExcelLabels {
  workbookTitle: string;
  sheetName: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  updatedAt: string;
}

export async function createBuyerExcel(
  buyers: ReadonlyArray<Buyer>,
  labels: BuyerExcelLabels,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [labels.id, labels.name, labels.email, labels.phone, labels.updatedAt],
    [40, 30, 34, 22, 22],
  );

  for (const buyer of buyers) {
    worksheet.addRow([
      safeExcelText(buyer.id),
      safeExcelText(buyer.name),
      safeExcelText(buyer.email ?? ""),
      safeExcelText(buyer.phone ?? ""),
      parseExcelTimestamp(buyer.updatedAt, timeZone),
    ]);
  }

  worksheet.getColumn(5).numFmt = "yyyy-mm-dd hh:mm";
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveBuyerExcel(
  buyers: ReadonlyArray<Buyer>,
  labels: BuyerExcelLabels,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  return saveExcelFile(() => createBuyerExcel(buyers, labels), defaultFileName);
}
