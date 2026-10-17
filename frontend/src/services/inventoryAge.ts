const MILLISECONDS_PER_DAY = 86_400_000;

export type InventoryAgeFilter = "all" | "upTo7" | "from8To30" | "over30";

function localCalendarDayValue(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calculateStorageAgeDays(
  registeredAt: string,
  now: Date = new Date(),
): number | null {
  const registeredDate = new Date(registeredAt);
  if (Number.isNaN(registeredDate.getTime()) || Number.isNaN(now.getTime())) return null;

  const elapsedDays = Math.round(
    (localCalendarDayValue(now) - localCalendarDayValue(registeredDate)) /
    MILLISECONDS_PER_DAY,
  );
  return Math.max(0, elapsedDays);
}

export function filterInventoryByStorageAge<T extends { registeredAt: string }>(
  records: readonly T[],
  filter: InventoryAgeFilter,
  now: Date = new Date(),
): T[] {
  if (filter === "all") return [...records];

  return records.filter((record) => {
    const ageDays = calculateStorageAgeDays(record.registeredAt, now);
    if (ageDays === null) return false;
    if (filter === "upTo7") return ageDays <= 7;
    if (filter === "from8To30") return ageDays >= 8 && ageDays <= 30;
    return ageDays > 30;
  });
}
