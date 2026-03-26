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

/** When set on `Activity`, the row is a virtual instance from `activity_series`. */
export type SeriesOccurrenceMeta = {
  seriesId: string
  /** Canonical occurrence start (matches `activity_series_exceptions.occurrence_start`). */
  occurrenceStart: string
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
  /** Virtual row from `activity_series` expansion; omit for normal activities. */
  seriesOccurrence?: SeriesOccurrenceMeta
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

// --- Recurring series (`activity_series` + expansion to virtual `Activity` rows) ---

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY'

/** Stored in `activity_series.recurrence` (jsonb). Validated further in app / expansion. */
export interface RecurrenceRule {
  freq: RecurrenceFreq
  interval: number
  /** 0 = Sunday … 6 = Saturday; optional advanced use (expansion may ignore). */
  byWeekday?: number[] | null
  until?: string | null
  count?: number | null
}

export interface ActivitySeriesExceptionRow {
  id: string
  series_id: string
  family_id: string
  occurrence_start: string
  exception_type: 'cancelled' | 'modified'
  override_start_at: string | null
  override_end_at: string | null
  /** Merged over the series row for this instance when `exception_type === 'modified'`. */
  override_data?: Record<string, unknown> | null
  created_at: string
}

export interface ActivitySeriesParticipantRow {
  id: string
  series_id: string
  family_id: string
  member_id: string
  response: ActivityResponse
  responded_at: string | null
  is_creator: boolean
  created_at: string
}

export interface ActivitySeries {
  id: string
  family_id: string
  title: string
  location: string | null
  money: number | null
  ride_needed: boolean | null
  present_needed: boolean | null
  babysitter_needed: boolean | null
  notes: string | null
  status: ActivityStatus
  rejection_reason?: string | null
  created_by: string
  created_at: string
  updated_at: string
  first_start_at: string
  first_end_at: string
  recurrence: RecurrenceRule
}

/** Payload for inserting a new repeating series (mirrors `ActivityInsert` timing + flags). */
export type ActivitySeriesInsert = {
  family_id: string
  title: string
  location?: string | null
  money?: number | null
  ride_needed: boolean
  present_needed: boolean
  babysitter_needed: boolean
  notes?: string | null
  created_by: string
  first_start_at: string
  first_end_at: string
  recurrence: RecurrenceRule
}

export interface ActivitySeriesWithRelations extends Omit<ActivitySeries, 'created_by'> {
  created_by: FamilyMember
  participants: ActivitySeriesParticipantRow[]
  exceptions: ActivitySeriesExceptionRow[]
}

export function isVirtualSeriesActivity(a: Activity): boolean {
  return a.seriesOccurrence != null
}
