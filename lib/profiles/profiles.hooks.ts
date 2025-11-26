// lib/profiles/profiles.hooks.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateProfile, uploadAvatar } from './profiles.api'

export function useProfile(profileId: string | undefined) {
    return useQuery({
        queryKey: ['profile', profileId],
        queryFn: () => fetchProfile(profileId!),
        enabled: !!profileId,
    })
}

export function useUpdateProfile() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async ({
            profileId,
            updates,
            avatarFileUri,
        }: {
            profileId: string
            updates?: Record<string, any>
            avatarFileUri?: string | null
        }) => {
            // 1️⃣ handle avatar upload first (if any)
            if (avatarFileUri) {
                await uploadAvatar(profileId, avatarFileUri)
            }

            // 2️⃣ then handle normal profile fields
            if (updates && Object.keys(updates).length > 0) {
                await updateProfile(profileId, updates)
            }
        },

        onSuccess: (_, { profileId }) => {
            // Re-fetch the updated profile
            qc.invalidateQueries({ queryKey: ['profile', profileId] })
            qc.invalidateQueries({ queryKey: ['family-members'] })
        },
    })
}
