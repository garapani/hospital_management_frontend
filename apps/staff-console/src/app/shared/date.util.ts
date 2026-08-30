/**
 * Local-timezone calendar date as 'YYYY-MM-DD'. `new Date().toISOString().slice(0, 10)` is the
 * UTC date and is wrong for the first 5.5 hours of every IST day (00:00-05:29 local resolves to
 * the previous day) — this app's whole target market is IST, so that bug is not an edge case.
 */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
