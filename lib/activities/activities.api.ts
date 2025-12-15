// lib/activities/activities.api.ts
import { MEMBER_WITH_PROFILE_SELECT } from '../members/members.select'
import { getSupabase } from '../supabase'
import type {
  Activity,
  ActivityInsert,
  ActivityParticipantUpsert,
  ActivityStatus,
} from './activities.types'

const supabase = getSupabase()

function mapOut(a: any): Activity {
  return {
    ...a,
    created_by: Array.isArray(a.created_by) ? a.created_by[0] : a.created_by,
  } as Activity
}

export async function rpcCreateActivity(
  activity: ActivityInsert,
  participants: ActivityParticipantUpsert[]
): Promise<Activity> {
  const { data, error } = await supabase.rpc('create_activity_with_participants', {
    p_activity: activity,
    p_participants: participants ?? [],
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
  const { error } = await supabase.rpc('update_activity_with_participants', {
    p_activity_id: id,
    p_patch: patch,
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
  let q = supabase
    .from('activities')
    .select(`
      id,
      family_id,
      title,
      start_at,
      end_at,
      location,
      money,
      ride_needed,
      present_needed,
      babysitter_needed,
      notes,
      status,
      created_at,
      created_by:family_members!activities_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
      participants:activity_participants (*)
    `)
    .eq('family_id', familyId)
    .order('start_at', { ascending: true })

  if (params?.from) {
    q = q.gte('start_at', params.from.toISOString())
  }

  if (params?.to) {
    q = q.lte('start_at', params.to.toISOString())
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)

  return (data ?? []).map(mapOut)
}

export async function fetchActivityById(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      id,
      family_id,
      title,
      start_at,
      end_at,
      location,
      money,
      ride_needed,
      present_needed,
      babysitter_needed,
      notes,
      status,
      created_at,
      created_by:family_members!activities_created_by_fkey (${MEMBER_WITH_PROFILE_SELECT}),
      participants:activity_participants (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return mapOut(data)
}
