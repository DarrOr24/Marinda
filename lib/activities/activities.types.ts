// lib/activities/activities.types.ts
import type { FamilyMember } from '../members/members.types'

export type ActivityResponse = 'YES' | 'NO' | 'MAYBE'
export type ActivityStatus = 'APPROVED' | 'NOT_APPROVED' | 'PENDING'

export interface ActivityParticipant {
  id: string
  activity_id: string
  family_id: string
  member_id: string
  response: ActivityResponse
  responded_at: string | null
  is_creator: boolean
  created_at: string
}

export interface Activity {
  id: string
  family_id: string
  title: string
  start_at: string
  end_at: string
  location: string | null
  money: number | null
  ride_needed: boolean | null
  present_needed: boolean | null
  babysitter_needed: boolean | null
  participants: ActivityParticipant[]
  notes: string | null
  status: ActivityStatus
  /** Set when a parent rejects. Cleared when approved or back to pending. */
  rejection_reason?: string | null
  created_by: FamilyMember
  created_at: string
}

export type ActivityInsert = {
  family_id: string
  title: string
  start_at: string
  end_at: string
  location?: string | null
  money?: number | null
  ride_needed?: boolean
  present_needed?: boolean
  babysitter_needed?: boolean
  notes?: string | null
  created_by: string
}

export type ActivityUpdate = Partial<Omit<ActivityInsert, 'family_id'>> & { id: string }

/** Fields allowed in update_activity_with_participants patch */
export type ActivityPatch = Partial<ActivityInsert> & {
  status?: ActivityStatus
  rejection_reason?: string | null
}

export type ActivityParticipantUpsert = {
  member_id: string
  response?: ActivityResponse
  responded_at?: string | null
  is_creator?: boolean
}
