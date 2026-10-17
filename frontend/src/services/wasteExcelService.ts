import type { RemoteWasteRecord, WasteCategory, WasteStatus } from "./wasteService.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

export interface WasteExcelLabels {
  workbookTitle: string;
  sheetName: string;
  id: string;
  recordNumber: string;
  category: string;
  weightKg: string;
  container: string;
  registeredAt: string;
  status: string;
  categories: Record<WasteCategory, string>;
  statuses: Record<WasteStatus, string>;
}

export async function createWasteExcel(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: WasteExcelLabels,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [labels.id, labels.recordNumber, labels.category, labels.weightKg, labels.container, labels.registeredAt, labels.status],
    [40, 20, 22, 18, 24, 22, 18],
  );

  for (const record of records) {
    worksheet.addRow([
      safeExcelText(record.id),
      safeExcelText(`RES-${record.recordNumber.padStart(3, "0")}`),
      safeExcelText(labels.categories[record.category]),
      validExcelNumber(record.weightKg, "Waste history"),
      safeExcelText(containerCodes.get(record.containerId) ?? ""),
      parseExcelTimestamp(record.registeredAt, timeZone),
      safeExcelText(labels.statuses[record.status]),
    ]);
  }

  worksheet.getColumn(4).numFmt = '0.000 "kg"';
  worksheet.getColumn(6).numFmt = "yyyy-mm-dd hh:mm";
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveWasteExcel(
  records: ReadonlyArray<RemoteWasteRecord>,
  containerCodes: ReadonlyMap<string, string>,
  labels: WasteExcelLabels,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  return saveExcelFile(
    () => createWasteExcel(records, containerCodes, labels),
    defaultFileName,
  );
}
