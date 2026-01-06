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
      if (avatarFileUri) {
        await uploadMemberAvatar(memberId, avatarFileUri)
      }

      if (updates && Object.keys(updates).length > 0) {
        await updateMember(memberId, updates)
      }
    },

    onSuccess: (_, { memberId }) => {
      // refetch member + member lists
      qc.invalidateQueries({ queryKey: ['member', memberId] })
      qc.invalidateQueries({ queryKey: ['family-members'] })

      // cache-buster so all MemberAvatar instances refresh
      qc.setQueryData<FamilyMember>(['member', memberId], (old) =>
        old ? { ...old, avatarCacheBuster: Date.now() } : old,
      )
    },
  })
}
