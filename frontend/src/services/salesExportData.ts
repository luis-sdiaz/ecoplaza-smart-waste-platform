import type { SaleHistoryItem } from "./salesService.ts";
import {
  filterSalesHistory,
  sortSalesHistory,
  type SalesSortOption,
  type WasteCategoryFilter,
} from "./coreWorkflow.ts";
import { filterSalesByAmount, type SalesAmountRange } from "./salesAmountRange.ts";

export function prepareSalesForExport(
  sales: readonly SaleHistoryItem[],
  category: WasteCategoryFilter,
  sortOption: SalesSortOption,
  saleSearch: string,
  amountRange: SalesAmountRange,
): SaleHistoryItem[] {
  return sortSalesHistory(
    filterSalesByAmount(
      filterSalesHistory(sales, undefined, undefined, category, saleSearch),
      amountRange,
    ),
    sortOption,
  );
}
