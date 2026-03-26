// lib/activities/activities.attendee-filter.ts
import type { Activity } from './activities.types'

/** Parent: empty `memberIds` = everyone. Otherwise OR on participants. Kid: `mine` = self is a participant. */
export function filterActivitiesByAttendees(
  activities: Activity[],
  opts:
    | { kind: 'parent'; memberIds: string[] }
    | { kind: 'kid'; scope: 'family' | 'mine'; selfMemberId: string }
): Activity[] {
  if (opts.kind === 'kid') {
    if (opts.scope === 'family') return activities
    return activities.filter((a) =>
      (a.participants ?? []).some((p) => p.member_id === opts.selfMemberId)
    )
  }
  if (opts.memberIds.length === 0) return activities
  return activities.filter((a) =>
    (a.participants ?? []).some((p) => opts.memberIds.includes(p.member_id))
  )
}
