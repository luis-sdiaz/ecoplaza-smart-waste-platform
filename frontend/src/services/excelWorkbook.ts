import type { Workbook, Worksheet } from "exceljs";

const TITLE_FILL = "FF166534";
const HEADER_FILL = "FF15803D";
const WHITE = "FFFFFFFF";
const BORDER = "FFD1D5DB";
const HEADER_ROW_HEIGHT = 34;
const MAX_HEADER_WIDTH = 32;

function readableHeaderWidth(header: string, requestedWidth: number): number {
  const longestWord = Math.max(...header.trim().split(/\s+/u).map((word) => word.length));
  const wrappedHeaderWidth = Math.ceil(header.length / 2) + 2;
  return Math.max(requestedWidth, Math.min(MAX_HEADER_WIDTH, Math.max(longestWord + 2, wrappedHeaderWidth)));
}

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

export function parseExcelTimestamp(
  value: string,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Excel data contains an invalid timestamp.");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): number => {
    const parsed = Number(parts.find((item) => item.type === type)?.value);
    if (!Number.isInteger(parsed)) throw new Error("Excel data contains an invalid timestamp.");
    return parsed;
  };

  // Excel dates do not carry a time zone. Store the same wall-clock fields shown
  // by the application so Excel does not display the original UTC hour instead.
  return new Date(Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
    date.getUTCMilliseconds(),
  ));
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
  headerRow.height = HEADER_ROW_HEIGHT;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
  });

  worksheet.columns = widths.map((width, index) => ({
    width: readableHeaderWidth(headers[index] ?? "", width),
  }));
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
