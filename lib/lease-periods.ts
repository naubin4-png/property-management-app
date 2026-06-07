export function parseMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    ? date
    : null;
}

export function enumerateMonths(start: Date, end: Date) {
  const months: Date[] = [];

  for (
    let month = new Date(start);
    month <= end;
    month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))
  ) {
    months.push(month);
  }

  return months;
}

export function parseDollarAmount(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function monthInputValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
