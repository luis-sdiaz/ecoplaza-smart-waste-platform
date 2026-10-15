import { saveCsvFile } from "./csvService";
import {
  listSales,
  type SalesErrorCode,
} from "./salesService";
import { createSalesCsv, type SalesCsvLabels } from "./salesCsv";
import type { TimestampRange } from "./reportDateRange";
import { sortSalesHistory, type SalesSortOption } from "./coreWorkflow";

export { createSalesCsv, type SalesCsvLabels } from "./salesCsv";

export type SalesCsvExportResult =
  | { ok: true; status: "saved" | "cancelled" }
  | { ok: false; error: SalesErrorCode | "file_error" };

export async function exportSalesHistory(
  labels: SalesCsvLabels,
  defaultFileName: string,
  dateRange?: TimestampRange,
  buyerId?: string,
  sortOption: SalesSortOption = "newest",
): Promise<SalesCsvExportResult> {
  const salesResult = await listSales(dateRange, buyerId);
  if (!salesResult.ok) return { ok: false, error: salesResult.error.code };

  try {
    const status = await saveCsvFile(
      createSalesCsv(sortSalesHistory(salesResult.data, sortOption), labels),
      defaultFileName,
    );
    return { ok: true, status };
  } catch {
    return { ok: false, error: "file_error" };
  }
}
