import { createCsvRow, createUtf8Csv } from "./csvService.ts";
import type { SaleHistoryItem } from "./salesService";
import type { WasteCategory } from "./wasteService";

export interface SalesCsvLabels {
  reference: string;
  completedAt: string;
  category: string;
  weightKg: string;
  unitPriceCop: string;
  totalValueCop: string;
  categories: Record<WasteCategory, string>;
}

function validNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Sale contains an invalid numeric value.");
  }
  return value;
}

export function createSalesCsv(
  sales: ReadonlyArray<SaleHistoryItem>,
  labels: SalesCsvLabels,
): string {
  const rows = [
    createCsvRow([
      labels.reference,
      labels.completedAt,
      labels.category,
      labels.weightKg,
      labels.unitPriceCop,
      labels.totalValueCop,
    ]),
    ...sales.map((sale) => createCsvRow([
      `SAL-${sale.id.slice(0, 8).toUpperCase()}`,
      sale.soldAt,
      labels.categories[sale.category],
      validNumber(sale.weightKg),
      validNumber(sale.unitPrice),
      validNumber(sale.totalValue),
    ])),
  ];

  return createUtf8Csv(rows);
}
