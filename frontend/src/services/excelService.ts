import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export type SaveExcelResult = "saved" | "cancelled" | "busy";

let isExcelSaveInProgress = false;

export async function saveExcelFile(
  createContent: () => Promise<Uint8Array>,
  defaultFileName: string,
): Promise<SaveExcelResult> {
  if (isExcelSaveInProgress) return "busy";
  isExcelSaveInProgress = true;

  try {
    const content = await createContent();
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (filePath === null) return "cancelled";

    await writeFile(filePath, content);
    return "saved";
  } finally {
    isExcelSaveInProgress = false;
  }
}
