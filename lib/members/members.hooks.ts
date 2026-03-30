// lib/members/members.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchColorPalette,
  fetchMemberByFamilyAndProfile,
  fetchMemberById,
  getMemberAvatarPublicUrl,
  updateMember,
  uploadMemberAvatar,
} from './members.api'
import { Color, FamilyMember } from './members.types'

function decorateMember(member: FamilyMember): FamilyMember {
  return {
    ...member,
    public_avatar_url: member.avatar_url
      ? getMemberAvatarPublicUrl(member.avatar_url)
      : null,
  }
}

export function useMember(memberId: string | null) {
  return useQuery<FamilyMember>({
    queryKey: ['member', memberId],
    enabled: !!memberId,
    queryFn: async () => decorateMember(await fetchMemberById(memberId!)),
  })
}

export function useFamilyProfileMember(familyId: string | null, profileId: string | null) {
  return useQuery<FamilyMember>({
    queryKey: ['member-by-family-profile', familyId, profileId],
    enabled: !!familyId && !!profileId,
    queryFn: async () => decorateMember(await fetchMemberByFamilyAndProfile(familyId!, profileId!)),
  })
}

export function useColorPalette() {
  return useQuery<Color[]>({
    queryKey: ['color-palette'],
    queryFn: fetchColorPalette,
    staleTime: Infinity,
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memberId,
      updates,
      avatarFileUri,
    }: {
      memberId: string
      updates?: Record<string, any>
      avatarFileUri?: string | null
    }) => {
      let updatedMember = null

      if (avatarFileUri) {
        await uploadMemberAvatar(memberId, avatarFileUri)
        updatedMember = await fetchMemberById(memberId)
      }

      if (updates && Object.keys(updates).length > 0) {
        updatedMember = await updateMember(memberId, updates)
      }

      return updatedMember
    },

    onSuccess: (updatedMember, { memberId }) => {
      if (!updatedMember) return

      const nextMember = {
        ...decorateMember(updatedMember),
        avatarCacheBuster: Date.now(),
      }

      qc.setQueryData<FamilyMember>(['member', memberId], (old) => {
        const baseMember = nextMember ?? old

        if (!baseMember) return old

        return baseMember
      })

      qc.setQueriesData<FamilyMember[]>(
        { queryKey: ['family-members'] },
        (old) =>
          old?.map((member) =>
            member.id === memberId
              ? {
                ...member,
                ...nextMember,
              }
              : member,
          ) ?? old,
      )

      qc.setQueriesData<FamilyMember>(
        { queryKey: ['member-by-family-profile'] },
        (old) => (old?.id === memberId ? { ...old, ...nextMember } : old),
      )

      qc.invalidateQueries({ queryKey: ['member', memberId] })
      qc.invalidateQueries({ queryKey: ['family-members'] })
      qc.invalidateQueries({ queryKey: ['member-by-family-profile'] })
    },
  })
}
