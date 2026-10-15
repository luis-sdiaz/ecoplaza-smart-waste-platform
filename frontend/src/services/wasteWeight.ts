const GRAMS_PER_KILOGRAM = 1000;
const WEIGHT_PATTERN = /^(\d+)(?:\.(\d{1,3}))?$/;
const MAX_SAFE_WEIGHT_GRAMS = BigInt(Number.MAX_SAFE_INTEGER);

export function isSafeWasteWeightKg(value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;

  const weightGrams = Math.round(value * GRAMS_PER_KILOGRAM);
  return Number.isSafeInteger(weightGrams)
    && weightGrams > 0
    && weightGrams / GRAMS_PER_KILOGRAM === value;
}

export function parseWasteWeightKg(value: string): number | null {
  const match = WEIGHT_PATTERN.exec(value.trim());
  if (match === null) return null;

  const kilograms = match[1];
  const grams = (match[2] ?? "").padEnd(3, "0");
  const scaledWeight = BigInt(`${kilograms}${grams}`);
  if (scaledWeight <= 0n || scaledWeight > MAX_SAFE_WEIGHT_GRAMS) return null;

  const weightKg = Number(scaledWeight) / GRAMS_PER_KILOGRAM;
  return isSafeWasteWeightKg(weightKg)
    && Math.round(weightKg * GRAMS_PER_KILOGRAM) === Number(scaledWeight)
    ? weightKg
    : null;
}
