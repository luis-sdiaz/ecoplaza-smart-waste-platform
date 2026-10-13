export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface TimestampRange {
  startInclusive: string;
  endExclusive: string;
}

export type ReportDateRangePreset = "last7Days" | "last30Days" | "currentMonth";

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalDate(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (match === null) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  return date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
    ? date
    : null;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getReportDateRangePreset(
  preset: ReportDateRangePreset,
  now: Date = new Date(),
): ReportDateRange {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid current date.");

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (preset === "last7Days") start.setDate(start.getDate() - 6);
  if (preset === "last30Days") start.setDate(start.getDate() - 29);
  if (preset === "currentMonth") start.setDate(1);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export function isValidReportDateRange(range: ReportDateRange): boolean {
  const start = parseLocalDate(range.startDate);
  const end = parseLocalDate(range.endDate);
  return start !== null && end !== null && start.getTime() <= end.getTime();
}

export function toTimestampRange(range: ReportDateRange): TimestampRange {
  const start = parseLocalDate(range.startDate);
  const end = parseLocalDate(range.endDate);

  if (start === null || end === null || start.getTime() > end.getTime()) {
    throw new Error("Invalid report date range.");
  }

  const endExclusive = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1,
  );

  return {
    startInclusive: start.toISOString(),
    endExclusive: endExclusive.toISOString(),
  };
}

export function isTimestampInRange(
  timestamp: string,
  range: TimestampRange,
): boolean {
  const value = new Date(timestamp).getTime();
  const start = new Date(range.startInclusive).getTime();
  const end = new Date(range.endExclusive).getTime();

  return Number.isFinite(value) &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= value &&
    value < end;
}
