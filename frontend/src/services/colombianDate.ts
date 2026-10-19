export function formatColombianDate(isoDate: string): string {
  if (!isoDate) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function formatColombianDateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  if (startDate && endDate) {
    return `${formatColombianDate(startDate)} - ${formatColombianDate(endDate)}`;
  }
  if (startDate) {
    return `${formatColombianDate(startDate)} - ...`;
  }
  return `... - ${formatColombianDate(endDate)}`;
}

