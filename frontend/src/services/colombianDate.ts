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

export function formatColombianDateTime(
  isoDateStr: string | null | undefined,
  locale: "es" | "en" = "es",
): string {
  if (!isoDateStr) return "—";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoDateStr;
  }
}

export function formatColombianTime(
  isoDateStr: string | null | undefined,
  locale: "es" | "en" = "es",
): string {
  if (!isoDateStr) return "";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}


