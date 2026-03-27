// lib/activities/activities.recurrence.ts
import type {
  Activity,
  ActivityParticipant,
  ActivitySeriesExceptionRow,
  ActivitySeriesParticipantRow,
  ActivitySeriesWithRelations,
  RecurrenceFreq,
  RecurrenceRule,
} from './activities.types'

const MAX_EXPAND_STEPS = 10_000

export type RecurrenceEndInput =
  | { type: 'never' }
  | { type: 'count'; count: number }
  | { type: 'until'; untilIso: string }

export type RecurrenceEndModeUi = 'never' | 'count' | 'until'

/** Hydrate repeat controls from a stored `RecurrenceRule` (edit series). */
export function recurrenceRuleToEditFields(rule: RecurrenceRule): {
  freq: RecurrenceFreq
  intervalStr: string
  endMode: RecurrenceEndModeUi
  countStr: string
  untilIso: string | null
  /** 0–6 Sun–Sat; empty means UI should default from event start. */
  byWeekday: number[]
} {
  const intervalStr = String(
    Math.max(1, Math.min(999, Math.floor(rule.interval) || 1))
  )
  let endMode: RecurrenceEndModeUi = 'never'
  let countStr = '10'
  let untilIso: string | null = null
  if (rule.count != null && rule.count > 0) {
    endMode = 'count'
    countStr = String(rule.count)
  } else if (rule.until) {
    endMode = 'until'
    untilIso = rule.until
  }
  const byWeekday =
    rule.freq === 'WEEKLY' && Array.isArray(rule.byWeekday)
      ? [...new Set(rule.byWeekday.filter((d) => d >= 0 && d <= 6))].sort(
          (a, b) => a - b
        )
      : []

  return {
    freq: rule.freq,
    intervalStr,
    endMode,
    countStr,
    untilIso,
    byWeekday,
  }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** One-line summary for read-only UI (e.g. “This event only” edit). */
export function formatRecurrenceRuleSummary(rule: RecurrenceRule): string {
  const interval = Math.max(1, Math.min(999, Math.floor(rule.interval) || 1))
  let freqPart: string
  switch (rule.freq) {
    case 'DAILY':
      freqPart = interval === 1 ? 'Every day' : `Every ${interval} days`
      break
    case 'WEEKLY': {
      const base =
        interval === 1 ? 'Every week' : `Every ${interval} weeks`
      const wd = rule.byWeekday?.filter((d) => d >= 0 && d <= 6) ?? []
      const uniq = [...new Set(wd)].sort((a, b) => a - b)
      if (uniq.length > 1) {
        freqPart = `${base} (${uniq.map((d) => WEEKDAY_SHORT[d]).join(', ')})`
      } else {
        freqPart = base
      }
      break
    }
    case 'MONTHLY':
      freqPart =
        interval === 1 ? 'Every month' : `Every ${interval} months`
      break
  }
  let endPart: string
  if (rule.count != null && rule.count > 0) {
    endPart =
      rule.count === 1 ? '1 occurrence' : `${rule.count} occurrences`
  } else if (rule.until) {
    endPart = `Until ${new Date(rule.until).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  } else {
    endPart = 'Never ends'
  }
  return `${freqPart} · ${endPart}`
}

/** Builds a stored rule (Google-style: never / count / until are mutually exclusive). */
export function buildRecurrenceRule(
  freq: RecurrenceFreq,
  interval: number,
  firstStart: Date,
  end: RecurrenceEndInput,
  /** WEEKLY only: 0–6 Sun–Sat; omit or empty → first event’s weekday. */
  byWeekday?: number[] | null
): RecurrenceRule {
  const intervalN = Math.max(1, Math.min(999, Math.floor(interval)) || 1)
  let weeklyDays: number[] | null = null
  if (freq === 'WEEKLY') {
    const raw = byWeekday?.length
      ? [...new Set(byWeekday.filter((d) => d >= 0 && d <= 6))].sort(
          (a, b) => a - b
        )
      : [firstStart.getDay()]
    weeklyDays = raw.length ? raw : [firstStart.getDay()]
  }
  const base: RecurrenceRule = {
    freq,
    interval: intervalN,
    byWeekday: weeklyDays,
    until: null,
    count: null,
  }
  if (end.type === 'never') return base
  if (end.type === 'count') {
    return { ...base, count: Math.max(1, Math.floor(end.count)) }
  }
  return { ...base, until: end.untilIso }
}

export function normalizeRecurrenceRule(raw: unknown): RecurrenceRule {
  const r =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw as Record<string, unknown>)
  if (!r || typeof r !== 'object') {
    throw new Error('Invalid recurrence rule')
  }
  const freq = r.freq as RecurrenceRule['freq'] | undefined
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY') {
    throw new Error('Invalid recurrence freq')
  }
  return {
    freq,
    interval: Math.max(1, Number(r.interval) || 1),
    byWeekday: Array.isArray(r.byWeekday) ? (r.byWeekday as number[]) : null,
    until: r.until != null ? String(r.until) : null,
    count: r.count != null ? Math.max(1, Number(r.count)) : null,
  }
}

/** Local Sunday 00:00:00 of the week containing `d` (matches JS getDay() 0 = Sun). */
function getWeekStartSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + days)
  return x
}

function applyTimeFromFirst(source: Date, target: Date): void {
  target.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds()
  )
}

function weeklyDaysFromRule(rule: RecurrenceRule, firstStart: Date): number[] {
  const raw = (rule.byWeekday ?? []).filter((d) => d >= 0 && d <= 6)
  const uniq = [...new Set(raw)].sort((a, b) => a - b)
  return uniq.length ? uniq : [firstStart.getDay()]
}

const MAX_WEEKS_ITER = 520

/**
 * Chronological occurrence start times for a series (caps at `MAX_EXPAND_STEPS`).
 */
function buildOccurrenceStarts(
  firstStart: Date,
  rule: RecurrenceRule
): Date[] {
  const interval = Math.max(1, rule.interval || 1)
  const until = rule.until ? new Date(rule.until) : null
  const maxSlots =
    rule.count != null
      ? Math.min(Math.max(1, rule.count), MAX_EXPAND_STEPS)
      : MAX_EXPAND_STEPS

  const out: Date[] = []

  if (rule.freq === 'DAILY') {
    let cur = new Date(firstStart.getTime())
    while (out.length < maxSlots) {
      if (until && cur.getTime() > until.getTime()) break
      out.push(new Date(cur.getTime()))
      cur = addDaysLocal(cur, interval)
    }
    return out
  }

  if (rule.freq === 'MONTHLY') {
    let cur = new Date(firstStart.getTime())
    while (out.length < maxSlots) {
      if (until && cur.getTime() > until.getTime()) break
      out.push(new Date(cur.getTime()))
      const n = new Date(cur.getTime())
      n.setMonth(n.getMonth() + interval)
      cur = n
    }
    return out
  }

  // WEEKLY — optional multiple weekdays; every `interval` weeks from anchor week
  const wds = weeklyDaysFromRule(rule, firstStart)
  const anchorWeekStart = getWeekStartSunday(firstStart)

  for (let weekIndex = 0; weekIndex < MAX_WEEKS_ITER && out.length < maxSlots; weekIndex++) {
    if (weekIndex % interval !== 0) continue
    const weekStart = addDaysLocal(anchorWeekStart, 7 * weekIndex)
    for (const wd of wds) {
      if (out.length >= maxSlots) break
      const occ = new Date(weekStart.getTime())
      occ.setDate(occ.getDate() + wd)
      applyTimeFromFirst(firstStart, occ)
      if (occ.getTime() < firstStart.getTime()) continue
      if (until && occ.getTime() > until.getTime()) return out
      out.push(occ)
    }
  }
  return out
}

function exceptionForOccurrence(
  exceptions: ActivitySeriesExceptionRow[],
  occurrenceStart: Date
): ActivitySeriesExceptionRow | undefined {
  const t = occurrenceStart.getTime()
  return exceptions.find((e) => new Date(e.occurrence_start).getTime() === t)
}

function timeRangesOverlap(
  startA: string,
  endA: string,
  rangeFrom: Date,
  rangeTo: Date
): boolean {
  const sa = new Date(startA).getTime()
  const ea = new Date(endA).getTime()
  const rf = rangeFrom.getTime()
  const rt = rangeTo.getTime()
  return sa < rt && ea > rf
}

function seriesParticipantToActivityParticipant(
  p: ActivitySeriesParticipantRow,
  virtualActivityId: string
): ActivityParticipant {
  return {
    id: p.id,
    activity_id: virtualActivityId,
    family_id: p.family_id,
    member_id: p.member_id,
    response: p.response,
    responded_at: p.responded_at,
    is_creator: p.is_creator,
    created_at: p.created_at,
  }
}

/** Stable id for list keys and edit lookup (not a DB uuid). */
export function makeSeriesOccurrenceActivityId(
  seriesId: string,
  occurrenceStartMs: number
): string {
  return `rec:${seriesId}:${occurrenceStartMs}`
}

function mergeOverrideDataIntoSeries(
  series: ActivitySeriesWithRelations,
  data: Record<string, unknown> | null | undefined
): ActivitySeriesWithRelations {
  if (!data || typeof data !== 'object') return series
  const t = typeof data.title === 'string' ? data.title : series.title
  const loc =
    data.location !== undefined
      ? (data.location as string | null)
      : series.location
  const money =
    typeof data.money === 'number' ? data.money : series.money
  return {
    ...series,
    title: t,
    location: loc,
    money,
    ride_needed:
      typeof data.ride_needed === 'boolean'
        ? data.ride_needed
        : series.ride_needed,
    present_needed:
      typeof data.present_needed === 'boolean'
        ? data.present_needed
        : series.present_needed,
    babysitter_needed:
      typeof data.babysitter_needed === 'boolean'
        ? data.babysitter_needed
        : series.babysitter_needed,
    notes:
      data.notes !== undefined
        ? (data.notes as string | null)
        : series.notes,
  }
}

function buildVirtualActivity(
  series: ActivitySeriesWithRelations,
  startIso: string,
  endIso: string,
  occurrenceMeta: { seriesId: string; occurrenceStart: string }
): Activity {
  const id = makeSeriesOccurrenceActivityId(
    series.id,
    new Date(occurrenceMeta.occurrenceStart).getTime()
  )
  return {
    id,
    family_id: series.family_id,
    title: series.title,
    start_at: startIso,
    end_at: endIso,
    location: series.location,
    money: series.money,
    ride_needed: series.ride_needed,
    present_needed: series.present_needed,
    babysitter_needed: series.babysitter_needed,
    notes: series.notes,
    status: series.status,
    rejection_reason: series.rejection_reason ?? null,
    created_by: series.created_by,
    created_at: series.created_at,
    participants: series.participants.map((p) =>
      seriesParticipantToActivityParticipant(p, id)
    ),
    seriesOccurrence: occurrenceMeta,
  }
}

/**
 * Expands one series into virtual `Activity` rows overlapping `[rangeFrom, rangeTo]`.
 * Applies `activity_series_exceptions` (cancelled / modified).
 */
export function expandSeriesToVirtualActivities(
  series: ActivitySeriesWithRelations,
  rangeFrom: Date,
  rangeTo: Date
): Activity[] {
  let rule: RecurrenceRule
  try {
    rule = normalizeRecurrenceRule(series.recurrence)
  } catch {
    return []
  }

  const firstStart = new Date(series.first_start_at)
  const firstEnd = new Date(series.first_end_at)
  const durationMs = firstEnd.getTime() - firstStart.getTime()
  if (durationMs <= 0) return []

  const until = rule.until ? new Date(rule.until) : null

  const occurrenceStarts = buildOccurrenceStarts(firstStart, rule)
  const out: Activity[] = []

  for (const current of occurrenceStarts) {
    if (until && current.getTime() > until.getTime()) break

    const ex = exceptionForOccurrence(series.exceptions, current)
    const canonicalStartIso = current.toISOString()

    if (ex?.exception_type === 'cancelled') {
      continue
    }

    if (ex?.exception_type === 'modified' && ex.override_start_at && ex.override_end_at) {
      const mergedSeries = mergeOverrideDataIntoSeries(series, ex.override_data ?? null)
      const startIso = ex.override_start_at
      const endIso = ex.override_end_at
      if (timeRangesOverlap(startIso, endIso, rangeFrom, rangeTo)) {
        out.push(
          buildVirtualActivity(mergedSeries, startIso, endIso, {
            seriesId: series.id,
            occurrenceStart: ex.occurrence_start,
          })
        )
      }
      continue
    }

    const end = new Date(current.getTime() + durationMs)
    const startIso = current.toISOString()
    const endIso = end.toISOString()
    if (timeRangesOverlap(startIso, endIso, rangeFrom, rangeTo)) {
      out.push(
        buildVirtualActivity(series, startIso, endIso, {
          seriesId: series.id,
          occurrenceStart: canonicalStartIso,
        })
      )
    }
  }

  return out
}

export function mergeActivitiesWithSeriesOccurrences(
  activities: Activity[],
  seriesList: ActivitySeriesWithRelations[],
  rangeFrom: Date,
  rangeTo: Date
): Activity[] {
  const virtual = seriesList.flatMap((s) =>
    expandSeriesToVirtualActivities(s, rangeFrom, rangeTo)
  )
  return [...activities, ...virtual].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )
}
