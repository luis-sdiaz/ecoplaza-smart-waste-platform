import { saveCsvFile } from "./csvService";
import {
  listSales,
  type SalesErrorCode,
} from "./salesService";
import { createSalesCsv, type SalesCsvLabels } from "./salesCsv";
import type { TimestampRange } from "./reportDateRange";

export { createSalesCsv, type SalesCsvLabels } from "./salesCsv";

export type SalesCsvExportResult =
  | { ok: true; status: "saved" | "cancelled" }
  | { ok: false; error: SalesErrorCode | "file_error" };

export async function exportSalesHistory(
  labels: SalesCsvLabels,
  defaultFileName: string,
  dateRange?: TimestampRange,
): Promise<SalesCsvExportResult> {
  const salesResult = await listSales(dateRange);
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
