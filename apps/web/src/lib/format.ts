export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDays(value: number) {
  return `${value} day${Math.abs(value) === 1 ? "" : "s"}`;
}

export function formatDateFromEpoch(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
