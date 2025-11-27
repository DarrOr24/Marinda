// lib/profiles/profiles.hooks.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, getAvatarPublicUrl, updateProfile, uploadAvatar } from './profiles.api';

export function useProfile(profileId: string | undefined) {
    return useQuery({
        queryKey: ['profile', profileId],
        enabled: !!profileId,
        queryFn: async () => {
            const profile = await fetchProfile(profileId!)
            return {
                ...profile,
                public_avatar_url: profile.avatar_url
                    ? getAvatarPublicUrl(profile.avatar_url)
                    : null,
            }
        },
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
