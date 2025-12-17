// lib/chores/chores.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    addChore,
    approveChore,
    deleteChore,
    duplicateChore,
    fetchChores,
    rejectChore,
    submitChore,
    updateChore,
} from './chores.api'

const choresKey = (familyId?: string) => ['chores', familyId ?? null] as const

// Load chores (already merged with proofs via fetchChores)
export function useFamilyChores(familyId?: string) {
    return useQuery({
        queryKey: choresKey(familyId),
        enabled: !!familyId,
        queryFn: () => fetchChores(familyId!),
    })
}

export function useAddChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ familyId, chore }: { familyId: string; chore: any }) =>
            addChore(familyId, chore),
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useUpdateChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ choreId, fields }: { choreId: string; fields: any }) =>
            updateChore(choreId, fields),
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useDeleteChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteChore,
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useDuplicateChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: duplicateChore,
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useSubmitChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            choreId,
            memberIds,
            proofs,
            proofNote,
        }: {
            choreId: string
            memberIds: string[]
            proofs: any
            proofNote?: string
        }) => submitChore(choreId, memberIds, proofs, proofNote),
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useApproveChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            choreId,
            parentMemberId,
            notes,
        }: {
            choreId: string
            parentMemberId: string
            notes?: string
        }) => approveChore(choreId, parentMemberId, notes),
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}

export function useRejectChore(familyId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ choreId, notes }: { choreId: string; notes?: string }) =>
            rejectChore(choreId, notes),
        onSuccess: () => qc.invalidateQueries({ queryKey: choresKey(familyId) }),
    })
}
