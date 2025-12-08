// lib/families/families.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthContext } from '@/hooks/use-auth-context'
import { useToast } from '@/hooks/use-toast-context'
import {
  fetchFamily,
  fetchFamilyMembers,
  fetchMyFamilies,
  removeFamilyMember,
  rotateFamilyCode,
  rpcCreateFamily,
  rpcJoinFamily,
  updateFamilyAvatar,
  updateMemberRole,
} from '@/lib/families/families.api'
import { Member, MyFamily, Role } from '@/lib/families/families.types'


export function useCreateFamily() {
  const qc = useQueryClient()
  const { setActiveFamilyId } = useAuthContext()

  return useMutation({
    mutationFn: (name: string) => rpcCreateFamily(name),

    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: ['families'] })
      const previous = qc.getQueryData(['families'])
      qc.setQueryData(['families'], (old: any) => ([...(old ?? []), { id: 'temp', name }]))
      return { previous }
    },

    onSuccess: (familyId: string) => {
      setActiveFamilyId(familyId)
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['family', familyId] })
      qc.invalidateQueries({ queryKey: ['family-members', familyId] })
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['families'], ctx.previous)
    },
  })
}

export function useJoinFamily(defaultRole: Role = 'ADULT') {
  const qc = useQueryClient()
  const { setActiveFamilyId } = useAuthContext()

  return useMutation({
    mutationFn: ({ code, role }: { code: string; role?: Role }) =>
      rpcJoinFamily(code, role ?? defaultRole),
    onSuccess: async (familyId: string) => {
      await setActiveFamilyId(familyId)
      qc.invalidateQueries({ queryKey: ['families'] })
      qc.invalidateQueries({ queryKey: ['family', familyId] })
      qc.invalidateQueries({ queryKey: ['family-members', familyId] })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useFamily(familyId?: string) {
  const family = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => fetchFamily(familyId!),
    enabled: !!familyId,            // ⬅ important!
  })

  const members = useQuery({
    queryKey: ['family-members', familyId],
    queryFn: () => fetchFamilyMembers(familyId!),
    enabled: !!familyId,            // ⬅ important!
  })

  return { family, members }
}

export function useUpdateMemberRole(familyId: string) {
  const qc = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      updateMemberRole(memberId, role),

    // Optimistically update the family members list
    onMutate: async (variables) => {
      const { memberId, role } = variables
      await qc.cancelQueries({ queryKey: ['family-members', familyId] })
      const previousMembers = qc.getQueryData<Member[]>(['family-members', familyId]) ?? []
      qc.setQueryData<Member[]>(['family-members', familyId], (old) => {
        if (!old) return old
        return old.map((m) => m.id === memberId ? { ...m, role } : m)
      })

      return { previousMembers }
    },

    onError: (error, _vars, context) => {
      if (context?.previousMembers) {
        qc.setQueryData<Member[]>(
          ['family-members', familyId],
          context.previousMembers
        )
      }

      const message = error?.message ?? 'Could not update role. Please try again.'
      showToast(message, 'error')
    },
  })
}

export function useUpdateFamilyAvatar(familyId: string) {
  const qc = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (fileUri: string) => updateFamilyAvatar(familyId, fileUri),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', familyId] }),
    onError: (error: any) => {
      showToast(
        error?.message ?? 'Could not update family photo. Please try again.',
        'error'
      )
    },
  })
}

export function useRotateFamilyCode(familyId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => rotateFamilyCode(familyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', familyId] }),
  })
}

export function useRemoveMember(familyId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => removeFamilyMember(familyId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-members', familyId] }),
  })
}

export function useMyFamilies(profileId?: string) {
  return useQuery<MyFamily[]>({
    queryKey: ['my-families', profileId],
    queryFn: () => fetchMyFamilies(profileId!),
    enabled: !!profileId,
  })
}
