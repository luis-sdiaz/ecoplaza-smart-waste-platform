import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

const CSV_SEPARATOR = ";";
const FORMULA_PREFIX_PATTERN = /^[\t\r ]*[=+\-@]/;

export type SaveCsvResult = "saved" | "cancelled";

function protectCsvFormula(value: string): string {
  return FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function escapeCsvValue(value: string | number): string {
  const safeValue = protectCsvFormula(String(value));
  return /[;"\r\n]/.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

export function createCsvRow(values: ReadonlyArray<string | number>): string {
  return values.map(escapeCsvValue).join(CSV_SEPARATOR);
}

export function createUtf8Csv(rows: ReadonlyArray<string>): string {
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export async function saveCsvFile(
  content: string,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  const filePath = await save({
    defaultPath: defaultFileName,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (filePath === null) return "cancelled";
  await writeTextFile(filePath, content);
  return "saved";
}
