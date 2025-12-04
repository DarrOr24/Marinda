// lib/announcements/announcements.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    addAnnouncement,
    createAnnouncementTab,
    deleteAnnouncement,
    deleteAnnouncementTab,
    fetchAnnouncements,
    fetchAnnouncementTabs,
    updateAnnouncement,
    updateAnnouncementTab,
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
            qc.invalidateQueries({
                queryKey: announcementsKey(familyId),
                refetchType: 'active',
            })
        },
    })
}

/** Update announcement */
export function useUpdateAnnouncement(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (args: {
            id: string
            updates: Parameters<typeof updateAnnouncement>[1]
        }) => updateAnnouncement(args.id, args.updates),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: announcementsKey(familyId),
                refetchType: 'active',
            })
        },
    })
}

/** Delete announcement */
export function useDeleteAnnouncement(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteAnnouncement(id),

        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: announcementsKey(familyId),
                refetchType: 'active',
            })
        },
    })
}

// -----------------------------
// Tabs query
// -----------------------------
const tabsKey = (familyId?: string) =>
    ['announcement-tabs', familyId ?? null] as const

export function useFamilyAnnouncementTabs(familyId?: string) {
    return useQuery({
        queryKey: tabsKey(familyId),
        queryFn: () => fetchAnnouncementTabs(familyId!),
        enabled: !!familyId,
    })
}

// -----------------------------
// Create tab
// -----------------------------
export function useCreateAnnouncementTab(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (args: Parameters<typeof createAnnouncementTab>[0]) =>
            createAnnouncementTab(args),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tabsKey(familyId) })
        },
    })
}

// -----------------------------
// Update tab
// -----------------------------
export function useUpdateAnnouncementTab(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (args: {
            id: string
            updates: { label?: string; placeholder?: string }
        }) => updateAnnouncementTab(args.id, args.updates),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tabsKey(familyId) })
        },
    })
}

// -----------------------------
// Delete tab
// -----------------------------
export function useDeleteAnnouncementTab(familyId?: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteAnnouncementTab(id),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tabsKey(familyId) })
        },
    })
}
