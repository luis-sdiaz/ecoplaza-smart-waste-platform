import type { RemoteWasteRecord, WasteCategory } from "./wasteService.ts";
import { calculateStorageAgeDays } from "./inventoryAge.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

export interface InventoryExcelLabels {
  workbookTitle: string;
  sheetName: string;
  recordNumber: string;
  container: string;
  category: string;
  weightKg: string;
  registeredAt: string;
  storageAgeDays: string;
  categories: Record<WasteCategory, string>;
}

export async function createInventoryExcel(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: InventoryExcelLabels,
  ageReferenceDate: Date = new Date(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [
      labels.recordNumber,
      labels.container,
      labels.category,
      labels.weightKg,
      labels.registeredAt,
      labels.storageAgeDays,
    ],
    [18, 22, 22, 22, 20, 20],
  );

  for (const record of records) {
    const storageAgeDays = calculateStorageAgeDays(record.registeredAt, ageReferenceDate);
    worksheet.addRow([
      safeExcelText(record.recordNumber),
      safeExcelText(containerCodes.get(record.containerId) ?? ""),
      safeExcelText(labels.categories[record.category]),
      validExcelNumber(record.weightKg, "Inventory"),
      parseExcelTimestamp(record.registeredAt, timeZone),
      storageAgeDays === null ? null : validExcelNumber(storageAgeDays, "Inventory"),
    ]);
  }

  worksheet.getColumn(4).numFmt = '0.000 "kg"';
  worksheet.getColumn(5).numFmt = "yyyy-mm-dd";
  worksheet.getColumn(6).numFmt = "0";
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveInventoryExcel(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: InventoryExcelLabels,
  ageReferenceDate: Date,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  return saveExcelFile(
    () => createInventoryExcel(records, containerCodes, labels, ageReferenceDate),
    defaultFileName,
  );
}
