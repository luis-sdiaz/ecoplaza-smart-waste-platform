import type { Container } from "./containerService.ts";
import type { ContainerStockSummary } from "./coreWorkflow.ts";
import { saveExcelFile, type SaveExcelResult } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

export interface ContainerExcelLabels {
  workbookTitle: string;
  sheetName: string;
  id: string;
  code: string;
  createdAt: string;
  availableRecordCount: string;
  availableWeightKg: string;
}

export async function createContainerExcel(
  containers: ReadonlyArray<Container>,
  stockByContainer: ReadonlyMap<string, ContainerStockSummary>,
  labels: ContainerExcelLabels,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [labels.id, labels.code, labels.createdAt, labels.availableRecordCount, labels.availableWeightKg],
    [40, 24, 22, 24, 22],
  );

  for (const container of containers) {
    const stock = stockByContainer.get(container.id);
    worksheet.addRow([
      safeExcelText(container.id),
      safeExcelText(container.code),
      parseExcelTimestamp(container.createdAt, timeZone),
      stock === undefined
        ? null
        : validExcelNumber(stock.availableRecordCount, "Container stock"),
      stock === undefined
        ? null
        : validExcelNumber(stock.availableWeightKg, "Container stock"),
    ]);
  }

  worksheet.getColumn(3).numFmt = "yyyy-mm-dd hh:mm";
  worksheet.getColumn(4).numFmt = "0";
  worksheet.getColumn(5).numFmt = '0.000 "kg"';
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function saveContainerExcel(
  containers: ReadonlyArray<Container>,
  stockByContainer: ReadonlyMap<string, ContainerStockSummary>,
  labels: ContainerExcelLabels,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  return saveExcelFile(
    () => createContainerExcel(containers, stockByContainer, labels),
    defaultFileName,
  );
}
