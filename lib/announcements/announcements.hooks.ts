// lib/announcements/announcements.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    addAnnouncement,
    deleteAnnouncement,
    fetchAnnouncements,
    updateAnnouncement
} from './announcements.api'
import type { AnnouncementItem } from './announcements.types'

const announcementsKey = (familyId?: string) =>
    ['announcements', familyId ?? null] as const

/** Load announcements */
export function useFamilyAnnouncements(familyId?: string) {
    return useQuery<AnnouncementItem[]>({
        queryKey: announcementsKey(familyId),
        queryFn: () => fetchAnnouncements(familyId!),
        enabled: !!familyId,
    })
}

/** Create announcement */
export function useCreateAnnouncement(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (args: Parameters<typeof addAnnouncement>[0]) =>
            addAnnouncement(args),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: announcementsKey(familyId), refetchType: 'active' })
        },
    })
}

/** Update announcement */
export function useUpdateAnnouncement(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        // wrap into a single variables object
        mutationFn: (args: { id: string; updates: Parameters<typeof updateAnnouncement>[1] }) =>
            updateAnnouncement(args.id, args.updates),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: announcementsKey(familyId), refetchType: 'active' })
        },
    })
}

/** Delete announcement */
export function useDeleteAnnouncement(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteAnnouncement(id),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: announcementsKey(familyId), refetchType: 'active' })
        },
    })
}
