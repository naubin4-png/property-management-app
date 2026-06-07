export function firstDayOfCurrentMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}
