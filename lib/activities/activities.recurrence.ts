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

/** Builds a stored rule (Google-style: never / count / until are mutually exclusive). */
export function buildRecurrenceRule(
  freq: RecurrenceFreq,
  interval: number,
  firstStart: Date,
  end: RecurrenceEndInput
): RecurrenceRule {
  const intervalN = Math.max(1, Math.min(999, Math.floor(interval)) || 1)
  const base: RecurrenceRule = {
    freq,
    interval: intervalN,
    byWeekday: freq === 'WEEKLY' ? [firstStart.getDay()] : null,
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

function nextOccurrence(current: Date, rule: RecurrenceRule): Date {
  const interval = Math.max(1, rule.interval || 1)
  switch (rule.freq) {
    case 'DAILY': {
      const d = new Date(current.getTime())
      d.setDate(d.getDate() + interval)
      return d
    }
    case 'WEEKLY': {
      const d = new Date(current.getTime())
      d.setDate(d.getDate() + 7 * interval)
      return d
    }
    case 'MONTHLY': {
      const d = new Date(current.getTime())
      d.setMonth(d.getMonth() + interval)
      return d
    }
  }
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
  const maxSlots = rule.count ?? Infinity

  const out: Activity[] = []
  let current = new Date(firstStart.getTime())
  let slot = 0

  while (slot < maxSlots && slot < MAX_EXPAND_STEPS) {
    if (until && current.getTime() > until.getTime()) break

    const ex = exceptionForOccurrence(series.exceptions, current)
    const canonicalStartIso = current.toISOString()

    if (ex?.exception_type === 'cancelled') {
      slot++
      current = nextOccurrence(current, rule)
      continue
    }

    if (ex?.exception_type === 'modified' && ex.override_start_at && ex.override_end_at) {
      const startIso = ex.override_start_at
      const endIso = ex.override_end_at
      if (timeRangesOverlap(startIso, endIso, rangeFrom, rangeTo)) {
        out.push(
          buildVirtualActivity(series, startIso, endIso, {
            seriesId: series.id,
            occurrenceStart: ex.occurrence_start,
          })
        )
      }
      slot++
      current = nextOccurrence(current, rule)
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

    slot++
    current = nextOccurrence(current, rule)
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
