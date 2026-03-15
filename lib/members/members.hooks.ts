// lib/members/members.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMember,
  getMemberAvatarPublicUrl,
  updateMember,
  uploadMemberAvatar,
} from './members.api'
import { FamilyMember } from './members.types'


export function useMember(memberId: string | null) {
  return useQuery<FamilyMember>({
    queryKey: ['member', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const member = await fetchMember(memberId!)
      return {
        ...member,
        public_avatar_url: member.avatar_url
          ? getMemberAvatarPublicUrl(member.avatar_url)
          : null,
      }
    },
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
      }

      if (updates && Object.keys(updates).length > 0) {
        updatedMember = await updateMember(memberId, updates)
      }

      return updatedMember
    },

    onSuccess: (updatedMember, { memberId }) => {
      const nextAvatarUrl =
        updatedMember?.avatar_url !== undefined
          ? getMemberAvatarPublicUrl(updatedMember.avatar_url)
          : null

      qc.setQueryData<FamilyMember>(['member', memberId], (old) => {
        const baseMember = updatedMember ?? old

        if (!baseMember) return old

        return {
          ...baseMember,
          public_avatar_url: nextAvatarUrl ?? baseMember.public_avatar_url ?? null,
          avatarCacheBuster: Date.now(),
        }
      })

      qc.setQueriesData<FamilyMember[]>(
        { queryKey: ['family-members'] },
        (old) =>
          old?.map((member) =>
            member.id === memberId
              ? {
                ...member,
                ...updatedMember,
                public_avatar_url:
                  nextAvatarUrl ?? member.public_avatar_url ?? null,
                avatarCacheBuster: Date.now(),
              }
              : member,
          ) ?? old,
      )

      qc.invalidateQueries({ queryKey: ['member', memberId] })
      qc.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}
