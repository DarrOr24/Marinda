// lib/profiles/profiles.hooks.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, getAvatarPublicUrl, updateProfile, uploadAvatar } from './profiles.api';

export function useProfile(profileId: string | null) {
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
            if (avatarFileUri) {
                await uploadAvatar(profileId, avatarFileUri)
            }

            if (updates && Object.keys(updates).length > 0) {
                await updateProfile(profileId, updates)
            }
        },

        onSuccess: (_, { profileId }) => {
            // 1️⃣ refetch profile + family
            qc.invalidateQueries({ queryKey: ['profile', profileId] })
            qc.invalidateQueries({ queryKey: ['family-members'] })

            // 2️⃣ bump a cache-buster on the profile query so all ProfileAvatar instances update
            qc.setQueryData(['profile', profileId], (old: any) =>
                old
                    ? {
                        ...old,
                        avatarCacheBuster: Date.now(),
                    }
                    : old
            )
        },
    })
}

