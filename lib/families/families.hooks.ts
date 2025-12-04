// lib/families/families.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthContext } from '@/hooks/use-auth-context'
import {
  fetchFamily,
  fetchFamilyMembers,
  removeFamilyMember,
  rotateFamilyCode,
  rpcCreateFamily,
  rpcJoinFamily,
  updateMemberRole,
} from '@/lib/families/families.api'
import { Role } from './families.types'


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

export function useFamily(familyId: string | undefined) {
  const family = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => fetchFamily(familyId!),
    enabled: !!familyId,
  })

  const members = useQuery({
    queryKey: ['family-members', familyId],
    queryFn: () => fetchFamilyMembers(familyId!),
    enabled: !!familyId,
  })

  return { family, members }
}

export function useUpdateMemberRole(familyId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      if (familyId) {
        qc.invalidateQueries({ queryKey: ['family-members', familyId] })
      }
    },
  })
}

export function useRotateFamilyCode(familyId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!familyId) throw new Error('No family id')
      return rotateFamilyCode(familyId)
    },
    onSuccess: () => {
      if (familyId) {
        qc.invalidateQueries({ queryKey: ['family', familyId] })
      }
    },
  })
}

export function useRemoveMember(familyId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => {
      if (!familyId) throw new Error('No family id')
      return removeFamilyMember(familyId, memberId)
    },
    onSuccess: () => {
      if (familyId) {
        qc.invalidateQueries({ queryKey: ['family-members', familyId] })
      }
    },
  })
}
