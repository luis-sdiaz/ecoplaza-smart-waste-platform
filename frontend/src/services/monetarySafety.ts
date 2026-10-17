import { isSafeWasteWeightKg } from "./wasteWeight.ts";

const CENTS_PER_COP = 100;
const SALE_TOTAL_SCALE = 100_000;
const MAX_SAFE_SCALED_VALUE = BigInt(Number.MAX_SAFE_INTEGER);
const UNIT_PRICE_PATTERN = /^(?:0|[1-9]\d{0,12})(?:[.,]\d{1,2})?$/;

export const MAX_MONETARY_FRACTION_DIGITS = 5;

function toScaledInteger(value: string, decimalPlaces: number): bigint | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value);
  if (match === null) return null;

  const fraction = (match[2] ?? "").replace(/0+$/, "");
  if (fraction.length > decimalPlaces) return null;

  const scaledValue = BigInt(`${match[1]}${fraction.padEnd(decimalPlaces, "0")}`);
  return scaledValue <= MAX_SAFE_SCALED_VALUE ? scaledValue : null;
}

function fromScaledInteger(value: bigint, scale: number): number | null {
  const parsedValue = Number(value) / scale;
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function parseUnitPrice(value: string): number | null {
  const normalizedValue = value.trim();
  if (!UNIT_PRICE_PATTERN.test(normalizedValue)) return null;

  const cents = toScaledInteger(normalizedValue.replace(",", "."), 2);
  if (cents === null || cents <= 0n) return null;

  return fromScaledInteger(cents, CENTS_PER_COP);
}

export function isSafeUnitPrice(value: number): boolean {
  return Number.isFinite(value)
    && value > 0
    && parseUnitPrice(String(value)) === value;
}

export function parseSafeSaleTotal(value: number | string): number | null {
  const normalizedValue = String(value).trim();
  const scaledValue = toScaledInteger(normalizedValue, MAX_MONETARY_FRACTION_DIGITS);
  if (scaledValue === null || scaledValue <= 0n) return null;

  return fromScaledInteger(scaledValue, SALE_TOTAL_SCALE);
}

export function calculateSafeEstimatedTotal(
  weightKg: number,
  unitPrice: number,
): number | null {
  if (!isSafeWasteWeightKg(weightKg) || !isSafeUnitPrice(unitPrice)) return null;

  const weightGrams = BigInt(Math.round(weightKg * 1000));
  const unitPriceCents = BigInt(Math.round(unitPrice * CENTS_PER_COP));
  const scaledTotal = weightGrams * unitPriceCents;
  if (scaledTotal > MAX_SAFE_SCALED_VALUE) return null;

  return fromScaledInteger(scaledTotal, SALE_TOTAL_SCALE);
}

export function sumSafeMonetaryValues(values: ReadonlyArray<number>): number | null {
  let scaledTotal = 0n;

  for (const value of values) {
    const scaledValue = toScaledInteger(String(value), MAX_MONETARY_FRACTION_DIGITS);
    if (scaledValue === null || scaledValue < 0n) return null;

    scaledTotal += scaledValue;
    if (scaledTotal > MAX_SAFE_SCALED_VALUE) return null;
  }

  return fromScaledInteger(scaledTotal, SALE_TOTAL_SCALE);
}

export function calculateSafeAveragePricePerKg(
  totalValue: number,
  weightKg: number,
): number | null {
  const scaledTotal = toScaledInteger(String(totalValue), MAX_MONETARY_FRACTION_DIGITS);
  if (scaledTotal === null || scaledTotal < 0n || !Number.isFinite(weightKg) || weightKg < 0) {
    return null;
  }
  if (weightKg === 0) return scaledTotal === 0n ? 0 : null;

  const weightGrams = Math.round(weightKg * 1000);
  if (
    !Number.isSafeInteger(weightGrams) ||
    weightGrams <= 0 ||
    Math.abs(weightKg - weightGrams / 1000) > Number.EPSILON * Math.max(1, weightKg)
  ) {
    return null;
  }

  const divisor = BigInt(weightGrams);
  const scaledAverage = (scaledTotal * 1000n + divisor / 2n) / divisor;
  if (scaledAverage > MAX_SAFE_SCALED_VALUE) return null;
  return fromScaledInteger(scaledAverage, SALE_TOTAL_SCALE);
}
