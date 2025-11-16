// lib/db-formats.ts
export const dbFormats = {
  toDbDate,
  parseDbDateLocal,
}

function toDbDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDbDateLocal(d: string): Date {
  // "YYYY-MM-DD" -> local Date at local midnight (no TZ shift)
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, (m - 1), day)
}
