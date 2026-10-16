export interface MaterialStatusBreakdown {
  totalWeightKg: number;
  availableWeightKg: number;
  soldWeightKg: number;
  otherWeightKg: number;
  availablePercentage: number;
  soldPercentage: number;
  otherPercentage: number;
}

export function calculateMaterialStatusBreakdown(totalWeightKg: number, availableWeightKg: number, soldWeightKg: number): MaterialStatusBreakdown | null {
  if (![totalWeightKg, availableWeightKg, soldWeightKg].every((value) => Number.isFinite(value) && value >= 0)) return null;
  const otherWeightKg = Math.max(0, totalWeightKg - availableWeightKg - soldWeightKg);
  if (availableWeightKg + soldWeightKg > totalWeightKg + Number.EPSILON * Math.max(1, totalWeightKg)) return null;
  const percentage = (value: number) => totalWeightKg === 0 ? 0 : (value / totalWeightKg) * 100;
  return {
    totalWeightKg, availableWeightKg, soldWeightKg, otherWeightKg,
    availablePercentage: percentage(availableWeightKg),
    soldPercentage: percentage(soldWeightKg),
    otherPercentage: percentage(otherWeightKg),
  };
}
