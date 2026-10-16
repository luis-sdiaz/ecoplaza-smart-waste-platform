const MILLISECONDS_PER_DAY = 86_400_000;

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
