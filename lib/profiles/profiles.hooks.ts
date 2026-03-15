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
            let updatedProfile = null

            if (avatarFileUri) {
                await uploadAvatar(profileId, avatarFileUri)
            }

            if (updates && Object.keys(updates).length > 0) {
                updatedProfile = await updateProfile(profileId, updates)
            }

            return updatedProfile
        },

        onSuccess: (updatedProfile, { profileId }) => {
            qc.setQueryData(['profile', profileId], (old: any) => {
                const nextAvatarUrl =
                    updatedProfile?.avatar_url !== undefined
                        ? getAvatarPublicUrl(updatedProfile.avatar_url)
                        : old?.public_avatar_url ?? null

                return {
                    ...old,
                    ...updatedProfile,
                    public_avatar_url: nextAvatarUrl,
                    avatarCacheBuster: Date.now(),
                }
            })

            qc.invalidateQueries({ queryKey: ['profile', profileId] })
            qc.invalidateQueries({ queryKey: ['family-members'] })
        },
    })
}

