// lib/activities/activities.series.api.ts
import { MEMBER_WITH_PROFILE_SELECT } from '../members/members.select'
import { getSupabase } from '../supabase'
import type {
  ActivityParticipantUpsert,
  ActivitySeriesInsert,
  ActivitySeriesWithRelations,
  RecurrenceRule,
} from './activities.types'
import { normalizeRecurrenceRule } from './activities.recurrence'

const supabase = getSupabase()

function mapSeriesOut(row: any): ActivitySeriesWithRelations {
  const created_by = Array.isArray(row.created_by)
    ? row.created_by[0]
    : row.created_by
  return {
    ...row,
    recurrence: normalizeRecurrenceRule(row.recurrence),
    created_by,
    participants: row.participants ?? [],
    exceptions: row.exceptions ?? [],
  } as ActivitySeriesWithRelations
}

export async function fetchFamilyActivitySeries(
  familyId: string
): Promise<ActivitySeriesWithRelations[]> {
  const { data, error } = await supabase
    .from('activity_series')
    .select(
      `
      id,
      family_id,
      title,
      location,
      money,
      ride_needed,
      present_needed,
      babysitter_needed,
      notes,
      status,
      rejection_reason,
      created_at,
      updated_at,
      first_start_at,
      first_end_at,
      recurrence,
      created_by:family_members!activity_series_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
      participants:activity_series_participants (*),
      exceptions:activity_series_exceptions (*)
    `
    )
    .eq('family_id', familyId)
    .order('first_start_at', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapSeriesOut)
}

const SERIES_SELECT = `
  id,
  family_id,
  title,
  location,
  money,
  ride_needed,
  present_needed,
  babysitter_needed,
  notes,
  status,
  rejection_reason,
  created_at,
  updated_at,
  first_start_at,
  first_end_at,
  recurrence,
  created_by:family_members!activity_series_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
  participants:activity_series_participants (*),
  exceptions:activity_series_exceptions (*)
`

export async function fetchActivitySeriesById(
  seriesId: string
): Promise<ActivitySeriesWithRelations | null> {
  const { data, error } = await supabase
    .from('activity_series')
    .select(SERIES_SELECT)
    .eq('id', seriesId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapSeriesOut(data)
}

export async function patchActivitySeries(
  seriesId: string,
  patch: Partial<
    Pick<
      ActivitySeriesWithRelations,
      | 'title'
      | 'location'
      | 'money'
      | 'ride_needed'
      | 'present_needed'
      | 'babysitter_needed'
      | 'notes'
      | 'status'
      | 'rejection_reason'
      | 'first_start_at'
      | 'first_end_at'
      | 'recurrence'
    >
  >
): Promise<void> {
  const row: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
  if (patch.recurrence != null) {
    row.recurrence = patch.recurrence as Record<string, unknown>
  }
  const { error } = await supabase.from('activity_series').update(row).eq('id', seriesId)
  if (error) throw new Error(error.message)
}

export async function cancelSeriesOccurrence(params: {
  seriesId: string
  familyId: string
  occurrenceStart: string
}): Promise<void> {
  const { error } = await supabase.from('activity_series_exceptions').upsert(
    {
      series_id: params.seriesId,
      family_id: params.familyId,
      occurrence_start: params.occurrenceStart,
      exception_type: 'cancelled',
      override_start_at: null,
      override_end_at: null,
      override_data: null,
    },
    { onConflict: 'series_id,occurrence_start' }
  )
  if (error) throw new Error(error.message)
}

export async function truncateSeriesFromOccurrence(params: {
  seriesId: string
  occurrenceStart: string
}): Promise<void> {
  const series = await fetchActivitySeriesById(params.seriesId)
  if (!series) throw new Error('Series not found')

  const occMs = new Date(params.occurrenceStart).getTime()
  const firstMs = new Date(series.first_start_at).getTime()

  if (occMs <= firstMs) {
    const { error } = await supabase.from('activity_series').delete().eq('id', params.seriesId)
    if (error) throw new Error(error.message)
    return
  }

  const rule = normalizeRecurrenceRule(series.recurrence)
  const boundary = occMs - 1
  const existingUntil = rule.until ? new Date(rule.until).getTime() : Infinity
  const newUntilMs = Math.min(existingUntil, boundary)
  const truncated: RecurrenceRule = {
    ...rule,
    until: new Date(newUntilMs).toISOString(),
    count: null,
  }

  await patchActivitySeries(params.seriesId, { recurrence: truncated })
}

export async function replaceActivitySeriesParticipants(
  seriesId: string,
  familyId: string,
  participants: ActivityParticipantUpsert[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('activity_series_participants')
    .delete()
    .eq('series_id', seriesId)
  if (delErr) throw new Error(delErr.message)

  if (participants.length === 0) return

  const { error: insErr } = await supabase.from('activity_series_participants').insert(
    participants.map((p) => ({
      series_id: seriesId,
      family_id: familyId,
      member_id: p.member_id,
      response: p.response ?? 'MAYBE',
      responded_at: p.responded_at ?? null,
      is_creator: p.is_creator ?? false,
    }))
  )
  if (insErr) throw new Error(insErr.message)
}

export async function upsertSeriesOccurrenceModified(params: {
  seriesId: string
  familyId: string
  occurrenceStart: string
  overrideStartAt: string
  overrideEndAt: string
  overrideData: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('activity_series_exceptions').upsert(
    {
      series_id: params.seriesId,
      family_id: params.familyId,
      occurrence_start: params.occurrenceStart,
      exception_type: 'modified',
      override_start_at: params.overrideStartAt,
      override_end_at: params.overrideEndAt,
      override_data: params.overrideData,
    },
    { onConflict: 'series_id,occurrence_start' }
  )
  if (error) throw new Error(error.message)
}

export function continuationRecurrenceRule(rule: RecurrenceRule): RecurrenceRule {
  return {
    freq: rule.freq,
    interval: rule.interval,
    byWeekday: rule.byWeekday ?? null,
    until: null,
    count: null,
  }
}

export async function splitSeriesForFutureEdits(params: {
  oldSeriesId: string
  occurrenceStart: string
  newSeries: ActivitySeriesInsert
  participants: ActivityParticipantUpsert[]
}): Promise<void> {
  await truncateSeriesFromOccurrence({
    seriesId: params.oldSeriesId,
    occurrenceStart: params.occurrenceStart,
  })
  await createActivitySeriesWithParticipants(params.newSeries, params.participants)
}

export async function updateEntireSeriesFromForm(params: {
  seriesId: string
  form: {
    title: string
    start_at: string
    end_at: string
    location?: string | null
    money?: number | null
    ride_needed?: boolean
    present_needed?: boolean
    babysitter_needed?: boolean
    notes?: string | null
    /** When set (e.g. user edited repeat / end), replaces the series rule. */
    recurrence?: RecurrenceRule
  }
  participants: ActivityParticipantUpsert[]
  familyId: string
}): Promise<void> {
  const { seriesId, form, participants, familyId } = params
  const series = await fetchActivitySeriesById(seriesId)
  if (!series) throw new Error('Series not found')

  const recurrence =
    form.recurrence != null
      ? normalizeRecurrenceRule(form.recurrence)
      : normalizeRecurrenceRule(series.recurrence)

  await patchActivitySeries(seriesId, {
    title: form.title,
    location: form.location ?? null,
    money: form.money ?? null,
    ride_needed: !!form.ride_needed,
    present_needed: !!form.present_needed,
    babysitter_needed: !!form.babysitter_needed,
    notes: form.notes ?? null,
    first_start_at: form.start_at,
    first_end_at: form.end_at,
    recurrence,
  })
  await replaceActivitySeriesParticipants(seriesId, familyId, participants)
}

export async function createActivitySeriesWithParticipants(
  series: ActivitySeriesInsert,
  participants: ActivityParticipantUpsert[]
): Promise<void> {
  const { error } = await supabase.rpc('create_activity_series_with_participants', {
    p_series: {
      family_id: series.family_id,
      title: series.title,
      location: series.location ?? null,
      money: series.money ?? null,
      ride_needed: series.ride_needed,
      present_needed: series.present_needed,
      babysitter_needed: series.babysitter_needed,
      notes: series.notes ?? null,
      created_by: series.created_by,
      first_start_at: series.first_start_at,
      first_end_at: series.first_end_at,
      recurrence: series.recurrence,
    },
    p_participants: participants ?? [],
  })

  if (error) throw new Error(error.message)
}
