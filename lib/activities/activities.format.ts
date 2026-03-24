/** End of local calendar day (23:59:59.999). */
export function endOfLocalDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Local calendar key YYYY-MM-DD (matches activity-board grouping). */
export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Every local calendar day that overlaps [startIso, endIso] (inclusive of both endpoints' days).
 */
export function collectLocalDateKeysOverlappingRange(
  startIso: string,
  endIso: string,
): string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const keys: string[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor.getTime() <= endDay.getTime()) {
    keys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/**
 * Compact time range for list rows. When the range crosses local days, includes short weekdays
 * (and times) so "Tue 3:00 PM–Thu 10:00 AM" is clear.
 */
export function formatActivityTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const startTime = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    if (startTime === endTime) return startTime;
    return `${startTime}–${endTime}`;
  }

  const startDay = start.toLocaleDateString(undefined, { weekday: "short" });
  const endDay = end.toLocaleDateString(undefined, { weekday: "short" });
  return `${startDay} ${startTime}–${endDay} ${endTime}`;
}
