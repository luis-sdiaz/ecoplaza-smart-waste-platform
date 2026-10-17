import type { Workbook, Worksheet } from "exceljs";

const TITLE_FILL = "FF166534";
const HEADER_FILL = "FF15803D";
const WHITE = "FFFFFFFF";
const BORDER = "FFD1D5DB";

export async function createExcelWorkbook(subject: string): Promise<Workbook> {
  const excelModule = await import("exceljs");
  const WorkbookConstructor = excelModule.Workbook ??
    (excelModule as unknown as { default: typeof excelModule }).default.Workbook;
  const workbook = new WorkbookConstructor();
  workbook.creator = "EcoPlaza";
  workbook.company = "EcoPlaza";
  workbook.subject = safeExcelText(subject);
  workbook.created = new Date();
  return workbook;
}

export function safeExcelText(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function validExcelNumber(value: number, context: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${context} contains an invalid numeric value.`);
  }
  return value;
}

export function parseExcelDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) throw new Error("Excel data contains an invalid date.");
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error("Excel data contains an invalid date.");
  }
  return date;
}

export function parseExcelTimestamp(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Excel data contains an invalid timestamp.");
  return date;
}

export function styleExcelWorksheet(
  worksheet: Worksheet,
  title: string,
  headers: readonly string[],
  widths: readonly number[],
): void {
  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = safeExcelText(title);
  titleCell.font = { bold: true, color: { argb: WHITE }, size: 15 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 26;

  const headerRow = worksheet.getRow(3);
  headerRow.values = [...headers.map(safeExcelText)];
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
  });

  worksheet.columns = widths.map((width) => ({ width }));
  worksheet.views = [{ state: "frozen", ySplit: 3, topLeftCell: "A4" }];
  worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
}

export function styleExcelBody(worksheet: Worksheet): void {
  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
      cell.alignment = { vertical: "middle" };
    });
  }
}
