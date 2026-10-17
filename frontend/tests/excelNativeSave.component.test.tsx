import { beforeEach, describe, expect, test, vi } from "vitest";

const tauriMocks = vi.hoisted(() => ({ save: vi.fn(), writeFile: vi.fn() }));

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: tauriMocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: tauriMocks.writeFile }));

import { saveExcelFile } from "../src/services/excelService";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

beforeEach(() => {
  tauriMocks.save.mockReset();
  tauriMocks.writeFile.mockReset();
});

describe("native Excel save flow", () => {
  test("writes binary XLSX bytes after the user confirms a native path", async () => {
    const content = new Uint8Array([80, 75, 3, 4]);
    tauriMocks.save.mockResolvedValue("C:\\exports\\report.xlsx");
    tauriMocks.writeFile.mockResolvedValue(undefined);

    await expect(saveExcelFile(async () => content, "report.xlsx")).resolves.toBe("saved");
    expect(tauriMocks.save).toHaveBeenCalledWith({
      defaultPath: "report.xlsx",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    expect(tauriMocks.writeFile).toHaveBeenCalledWith("C:\\exports\\report.xlsx", content);
  });

  test("handles cancellation and native write failures without false success", async () => {
    tauriMocks.save.mockResolvedValueOnce(null);
    await expect(saveExcelFile(async () => new Uint8Array([1]), "report.xlsx")).resolves.toBe("cancelled");
    expect(tauriMocks.writeFile).not.toHaveBeenCalled();

    tauriMocks.save.mockResolvedValueOnce("C:\\exports\\report.xlsx");
    tauriMocks.writeFile.mockRejectedValueOnce(new Error("write failed"));
    await expect(saveExcelFile(async () => new Uint8Array([1]), "report.xlsx")).rejects.toThrow("write failed");
  });

  test("returns busy while another Excel operation is generating content", async () => {
    const pendingContent = deferred<Uint8Array>();
    const first = saveExcelFile(() => pendingContent.promise, "first.xlsx");

    await expect(saveExcelFile(async () => new Uint8Array([2]), "second.xlsx")).resolves.toBe("busy");
    expect(tauriMocks.save).not.toHaveBeenCalled();

    tauriMocks.save.mockResolvedValueOnce(null);
    pendingContent.resolve(new Uint8Array([1]));
    await expect(first).resolves.toBe("cancelled");
  });
});
