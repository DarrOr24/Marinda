// lib/activities/activities.series.api.ts
import { MEMBER_WITH_PROFILE_SELECT } from '../members/members.select'
import { getSupabase } from '../supabase'
import type {
  ActivityParticipantUpsert,
  ActivitySeriesInsert,
  ActivitySeriesWithRelations,
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

export async function createActivitySeriesWithParticipants(
  series: ActivitySeriesInsert,
  participants: ActivityParticipantUpsert[]
): Promise<void> {
  const { data: row, error } = await supabase
    .from('activity_series')
    .insert({
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
      recurrence: series.recurrence as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const seriesId = row.id as string

  if (participants.length === 0) return

  const { error: pErr } = await supabase.from('activity_series_participants').insert(
    participants.map((p) => ({
      series_id: seriesId,
      family_id: series.family_id,
      member_id: p.member_id,
      response: p.response ?? 'MAYBE',
      responded_at: p.responded_at ?? null,
      is_creator: p.is_creator ?? false,
    }))
  )

  if (pErr) throw new Error(pErr.message)
}
