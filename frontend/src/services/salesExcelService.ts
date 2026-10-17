import type { TimestampRange } from "./reportDateRange.ts";
import type { WasteCategory } from "./wasteService.ts";
import { listSales, type SaleHistoryItem, type SalesErrorCode } from "./salesService.ts";
import type { SalesSortOption, WasteCategoryFilter } from "./coreWorkflow.ts";
import type { SalesAmountRange } from "./salesAmountRange.ts";
import { prepareSalesForExport } from "./salesExportData.ts";
import { saveExcelFile } from "./excelService.ts";
import {
  createExcelWorkbook,
  parseExcelTimestamp,
  safeExcelText,
  styleExcelBody,
  styleExcelWorksheet,
  validExcelNumber,
} from "./excelWorkbook.ts";

export interface SalesExcelLabels {
  workbookTitle: string;
  sheetName: string;
  saleId: string;
  buyer: string;
  date: string;
  category: string;
  weightKg: string;
  unitPriceCop: string;
  totalValueCop: string;
  categories: Record<WasteCategory, string>;
}

export type SalesExcelExportResult =
  | { ok: true; status: "saved" | "cancelled" | "busy" }
  | { ok: false; error: SalesErrorCode | "file_error" };

export async function createSalesExcel(
  sales: readonly SaleHistoryItem[],
  labels: SalesExcelLabels,
): Promise<Uint8Array> {
  const workbook = await createExcelWorkbook(labels.workbookTitle);
  const worksheet = workbook.addWorksheet(safeExcelText(labels.sheetName));
  styleExcelWorksheet(
    worksheet,
    labels.workbookTitle,
    [labels.saleId, labels.buyer, labels.date, labels.category, labels.weightKg, labels.unitPriceCop, labels.totalValueCop],
    [40, 28, 22, 22, 17, 20, 20],
  );

  for (const sale of sales) {
    worksheet.addRow([
      safeExcelText(sale.id),
      safeExcelText(sale.buyerName),
      parseExcelTimestamp(sale.soldAt),
      safeExcelText(labels.categories[sale.category]),
      validExcelNumber(sale.weightKg, "Sale"),
      validExcelNumber(sale.unitPrice, "Sale"),
      validExcelNumber(sale.totalValue, "Sale"),
    ]);
  }
  worksheet.getColumn(3).numFmt = "yyyy-mm-dd hh:mm";
  worksheet.getColumn(5).numFmt = '0.000 "kg"';
  worksheet.getColumn(6).numFmt = '"COP" #,##0.00';
  worksheet.getColumn(7).numFmt = '"COP" #,##0.00';
  styleExcelBody(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function exportSalesExcel(
  labels: SalesExcelLabels,
  defaultFileName: string,
  dateRange?: TimestampRange,
  buyerId?: string,
  category: WasteCategoryFilter = "all",
  sortOption: SalesSortOption = "newest",
  saleSearch = "",
  amountRange: SalesAmountRange = {},
): Promise<SalesExcelExportResult> {
  const salesResult = await listSales(dateRange, buyerId);
  if (!salesResult.ok) return { ok: false, error: salesResult.error.code };

  try {
    const sales = prepareSalesForExport(
      salesResult.data,
      category,
      sortOption,
      saleSearch,
      amountRange,
    );
    const status = await saveExcelFile(
      () => createSalesExcel(sales, labels),
      defaultFileName,
    );
    return { ok: true, status };
  } catch {
    return { ok: false, error: "file_error" };
  }
}
