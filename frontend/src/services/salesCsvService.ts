import { saveCsvFile } from "./csvService";
import type { CsvExportLanguage } from "./csvService";
import {
  listSales,
  type SalesErrorCode,
} from "./salesService";
import { createSalesCsv, type SalesCsvLabels } from "./salesCsv";
import type { TimestampRange } from "./reportDateRange";
import { type SalesSortOption, type WasteCategoryFilter } from "./coreWorkflow";
import { type SalesAmountRange } from "./salesAmountRange";
import { prepareSalesForExport } from "./salesExportData";

export { createSalesCsv, type SalesCsvLabels } from "./salesCsv";

export type SalesCsvExportResult =
  | { ok: true; status: "saved" | "cancelled" | "busy" }
  | { ok: false; error: SalesErrorCode | "file_error" };

export async function exportSalesHistory(
  labels: SalesCsvLabels,
  defaultFileName: string,
  language: CsvExportLanguage,
  dateRange?: TimestampRange,
  buyerId?: string,
  category: WasteCategoryFilter = "all",
  sortOption: SalesSortOption = "newest",
  saleSearch = "",
  amountRange: SalesAmountRange = {},
): Promise<SalesCsvExportResult> {
  const salesResult = await listSales(dateRange, buyerId);
  if (!salesResult.ok) return { ok: false, error: salesResult.error.code };

  try {
    const status = await saveCsvFile(
      createSalesCsv(
        prepareSalesForExport(salesResult.data, category, sortOption, saleSearch, amountRange),
        labels,
        language,
      ),
      defaultFileName,
    );
    return { ok: true, status };
  } catch {
    return { ok: false, error: "file_error" };
  }
}
