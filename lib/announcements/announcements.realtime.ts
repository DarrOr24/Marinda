// lib/announcements/announcements.realtime.ts
import { useSubscribeTableByFamily } from '../families/families.realtime'

export function useAnnouncementsRealtime(familyId?: string) {
    useSubscribeTableByFamily('announcement_items', familyId, ['announcements', familyId])
}
