import { saveCsvFile } from "./csvService";
import {
  listSales,
  type SalesErrorCode,
} from "./salesService";
import { createSalesCsv, type SalesCsvLabels } from "./salesCsv";

export { createSalesCsv, type SalesCsvLabels } from "./salesCsv";

export type SalesCsvExportResult =
  | { ok: true; status: "saved" | "cancelled" }
  | { ok: false; error: SalesErrorCode | "file_error" };

export async function exportSalesHistory(
  labels: SalesCsvLabels,
  defaultFileName: string,
): Promise<SalesCsvExportResult> {
  const salesResult = await listSales();
  if (!salesResult.ok) return { ok: false, error: salesResult.error.code };

  try {
    const status = await saveCsvFile(
      createSalesCsv(salesResult.data, labels),
      defaultFileName,
    );
    return { ok: true, status };
  } catch {
    return { ok: false, error: "file_error" };
  }
}
