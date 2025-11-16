// lib/activities/activities.realtime.ts
import { useSubscribeTableByFamily } from '../families/families.realtime'

export function useActivitiesRealtime(familyId?: string) {
  useSubscribeTableByFamily('activities', familyId, ['activities', familyId])
  useSubscribeTableByFamily('activity_participants', familyId, ['activities', familyId])
}