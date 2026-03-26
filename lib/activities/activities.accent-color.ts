// lib/activities/activities.accent-color.ts
import type { FamilyMember } from '@/lib/members/members.types'
import type { Activity } from './activities.types'

function memberHexColor(m: FamilyMember | undefined): string {
  if (!m?.color) return '#2563eb'
  return m.color.hex ?? '#2563eb'
}

/** Earlier birth date → older person. Missing birth_date sorts last. */
function birthSortKey(m: FamilyMember): number {
  const d = m.profile?.birth_date
  if (!d || d === '') return Number.MAX_SAFE_INTEGER
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t
}

/**
 * Row / card accent color: prefer attendees over creator.
 * - No participants → creator color
 * - Creator is among participants → creator color
 * - One participant (not creator) → that member’s color
 * - Several participants, creator not attending → oldest by birth_date (stable tie-break)
 */
export function getActivityRowAccentColor(
  activity: Activity,
  memberById: Map<string, FamilyMember>
): string {
  const creatorId = activity.created_by?.id
  const creatorMember = creatorId ? memberById.get(creatorId) : undefined

  const ids = [...new Set((activity.participants ?? []).map((p) => p.member_id))]

  if (ids.length === 0) {
    return memberHexColor(creatorMember)
  }

  const attendees = ids
    .map((id) => memberById.get(id))
    .filter((m): m is FamilyMember => m != null)

  if (attendees.length === 0) {
    return memberHexColor(creatorMember)
  }

  if (creatorId && attendees.some((m) => m.id === creatorId)) {
    return memberHexColor(creatorMember)
  }

  if (attendees.length === 1) {
    return memberHexColor(attendees[0])
  }

  const sorted = [...attendees].sort((a, b) => {
    const ka = birthSortKey(a)
    const kb = birthSortKey(b)
    if (ka !== kb) return ka - kb
    return a.id.localeCompare(b.id)
  })

  return memberHexColor(sorted[0])
}
