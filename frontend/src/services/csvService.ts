import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

const FORMULA_PREFIX_PATTERN = /^[\t\r ]*[=+\-@]/;

export type CsvExportLanguage = "en" | "es";

function getCsvSeparator(language: CsvExportLanguage): "," | ";" {
  return language === "es" ? ";" : ",";
}

function formatCsvNumber(value: number, language: CsvExportLanguage): string {
  const serializedValue = String(value);
  return language === "es" ? serializedValue.replace(".", ",") : serializedValue;
}

export type SaveCsvResult = "saved" | "cancelled" | "busy";

let isSaveInProgress = false;

function protectCsvFormula(value: string): string {
  return FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function escapeCsvValue(
  value: string | number,
  language: CsvExportLanguage = "en",
): string {
  const separator = getCsvSeparator(language);
  const serializedValue = typeof value === "number"
    ? formatCsvNumber(value, language)
    : value;
  const safeValue = protectCsvFormula(serializedValue);
  return safeValue.includes(separator) || /["\r\n]/.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

export function createCsvRow(
  values: ReadonlyArray<string | number>,
  language: CsvExportLanguage,
): string {
  return values.map((value) => escapeCsvValue(value, language))
    .join(getCsvSeparator(language));
}

export function createUtf8Csv(rows: ReadonlyArray<string>): string {
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export async function saveCsvFile(
  content: string,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  if (isSaveInProgress) return "busy";
  isSaveInProgress = true;

  try {
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (filePath === null) return "cancelled";
    await writeTextFile(filePath, content);
    return "saved";
  } finally {
    isSaveInProgress = false;
  }
}
