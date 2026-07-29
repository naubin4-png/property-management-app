export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function workspaceCalendarDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );
  return new Date(Date.UTC(values.year, values.month - 1, values.day));
}

export function firstDayOfWorkspaceMonth(now: Date, timeZone: string) {
  const localDate = workspaceCalendarDate(now, timeZone);
  return new Date(
    Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), 1),
  );
}

export function firstDayOfNextWorkspaceMonth(now: Date, timeZone: string) {
  const first = firstDayOfWorkspaceMonth(now, timeZone);
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
}

export function shiftCalendarDate(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
