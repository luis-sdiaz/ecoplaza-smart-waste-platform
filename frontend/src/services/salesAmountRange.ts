export type SalesAmountRange = {
  minimum?: number;
  maximum?: number;
};

export type SalesAmountRangeResult =
  | { valid: true; range: SalesAmountRange }
  | { valid: false; range: SalesAmountRange };

const DECIMAL_AMOUNT_PATTERN = /^(?:\d+|\d*\.\d+)$/;

function parseOptionalAmount(value: string): number | undefined | null {
  const normalized = value.trim();
  if (normalized === "") return undefined;
  if (!DECIMAL_AMOUNT_PATTERN.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function parseSalesAmountRange(
  minimumInput: string,
  maximumInput: string,
): SalesAmountRangeResult {
  const minimum = parseOptionalAmount(minimumInput);
  const maximum = parseOptionalAmount(maximumInput);
  const range: SalesAmountRange = {
    ...(minimum !== undefined && minimum !== null ? { minimum } : {}),
    ...(maximum !== undefined && maximum !== null ? { maximum } : {}),
  };

  if (
    minimum === null ||
    maximum === null ||
    (minimum !== undefined && maximum !== undefined && minimum > maximum)
  ) {
    return { valid: false, range };
  }
  return { valid: true, range };
}

export function filterSalesByAmount<T extends { totalValue: number }>(
  sales: readonly T[],
  range: SalesAmountRange,
): T[] {
  return sales.filter((sale) =>
    Number.isFinite(sale.totalValue) &&
    (range.minimum === undefined || sale.totalValue >= range.minimum) &&
    (range.maximum === undefined || sale.totalValue <= range.maximum)
  );
}
