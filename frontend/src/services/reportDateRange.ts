export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface TimestampRange {
  startInclusive: string;
  endExclusive: string;
}

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
