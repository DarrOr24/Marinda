// lib/activities/activities.api.ts
import { dbFormats } from '../db-formats'
import { MEMBER_WITH_PROFILE_SELECT } from '../members/members.select'
import { getSupabase } from '../supabase'
import type {
  Activity, ActivityInsert, ActivityParticipantUpsert, ActivityStatus
} from './activities.types'

const supabase = getSupabase()

function mapOut(a: any): Activity {
  return { ...a, activity_date: dbFormats.parseDbDateLocal(a.activity_date) } as Activity
}

export async function rpcCreateActivity(
  activity: ActivityInsert,
  participants: ActivityParticipantUpsert[],
  includeCreator = true
): Promise<Activity> {
  const { data, error } = await supabase.rpc('create_activity_with_participants', {
    p_activity: {
      ...activity,
      activity_date: dbFormats.toDbDate(activity.activity_date),
    },
    p_participants: participants ?? [],
    p_include_creator: includeCreator,
  })
  if (error) throw new Error(error.message)

  return fetchActivityById(data.id)
}

export async function rpcUpdateActivity(
  id: string,
  patch: Partial<ActivityInsert> & { status?: ActivityStatus },
  participants?: ActivityParticipantUpsert[] | null,
  replaceParticipants = false
): Promise<Activity> {
  const payload =
    patch.activity_date
      ? { ...patch, activity_date: dbFormats.toDbDate(patch.activity_date as Date) }
      : patch

  const { error } = await supabase.rpc('update_activity_with_participants', {
    p_activity_id: id,
    p_patch: payload,
    p_participants: participants ?? null,
    p_replace_participants: replaceParticipants,
  })
  if (error) throw new Error(error.message)

  return fetchActivityById(id)
}

export async function fetchFamilyActivities(
  familyId: string,
  params?: { from?: Date; to?: Date }
): Promise<Activity[]> {
  let q = supabase.from('activities')
    .select(`
      id, family_id, title, activity_date, time, location, money,
      ride_needed, present_needed, babysitter_needed, notes, status, created_at,
      created_by:family_members!activities_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
      participants:activity_participants (*)
    `)
    .eq('family_id', familyId)
    .order('activity_date', { ascending: true })
    .order('time', { ascending: true })

  if (params?.from) q = q.gte('activity_date', dbFormats.toDbDate(params.from))
  if (params?.to) q = q.lte('activity_date', dbFormats.toDbDate(params.to))

  const { data, error } = await q
  if (error) throw new Error(error.message)

  console.log('[fetchFamilyActivities] data', data)
  return (data ?? []).map(mapOut)
}

export async function fetchActivityById(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      id, family_id, title, activity_date, time, location, money,
      ride_needed, present_needed, babysitter_needed, notes, status, created_at,
      created_by:family_members!activities_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
      participants:activity_participants (*)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return mapOut(data)
}
