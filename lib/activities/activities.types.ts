// lib/activities/activities.types.ts
import type { Member } from '../families/families.types'

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
  activity_date: string
  time: string
  location: string | null
  money: number | null
  ride_needed: boolean | null
  present_needed: boolean | null
  babysitter_needed: boolean | null
  participants: ActivityParticipant[]
  notes: string | null
  status: ActivityStatus
  created_by: Member
  created_at: string
}

export type ActivityInsert = {
  family_id: string
  title: string
  activity_date: string
  time: string
  location?: string | null
  money?: number | null
  ride_needed?: boolean
  present_needed?: boolean
  babysitter_needed?: boolean
  notes?: string | null
  created_by: string
}

export type ActivityUpdate = Partial<Omit<ActivityInsert, 'family_id'>> & { id: string }

export type ActivityParticipantUpsert = {
  member_id: string
  response?: ActivityResponse
  responded_at?: string | null
  is_creator?: boolean
}
