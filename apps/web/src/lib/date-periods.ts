export function currentPeriodRange(type: "DAILY_PRODUCTIVITY" | "WEEKLY_PRODUCTIVITY" | "MONTHLY_PRODUCTIVITY") {
  const now = new Date();
  if (type === "DAILY_PRODUCTIVITY") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { start, end };
  }
  if (type === "WEEKLY_PRODUCTIVITY") {
    const day = now.getDay() || 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}
