// lib/activities/activities.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFamilyActivities,
  rpcCreateActivity,
  rpcUpdateActivity,
} from './activities.api';
import type {
  Activity,
  ActivityInsert,
  ActivityParticipantUpsert,
  ActivityStatus,
} from './activities.types';


const activitiesKey = (
  familyId: string | undefined,
  params?: { from?: Date; to?: Date }
) => [
  'activities',
  familyId ?? null,
  params?.from ? params.from.toISOString() : null,
  params?.to ? params.to.toISOString() : null,
] as const

const invalidateFamilyActivities = (qc: ReturnType<typeof useQueryClient>, familyId?: string) => {
  if (!familyId) return
  qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey as any[]
      return Array.isArray(k) && k[0] === 'activities' && k[1] === familyId
    },
    refetchType: 'active',
  })
}

export function useFamilyActivities(
  familyId: string | undefined,
  params?: { from?: Date; to?: Date }
) {
  return useQuery<Activity[]>({
    queryKey: activitiesKey(familyId, params),
    queryFn: () => fetchFamilyActivities(familyId!, params),
    enabled: !!familyId,
  })
}

export function useCreateActivity(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      activity: ActivityInsert
      participants: ActivityParticipantUpsert[]
      includeCreator?: boolean
    }) => rpcCreateActivity(args.activity, args.participants, args.includeCreator ?? true),

    onSuccess: () => {
      invalidateFamilyActivities(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[createActivity] error:', err)
    },
  })
}

export function useUpdateActivity(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      patch: Partial<ActivityInsert> & { status?: ActivityStatus }
      participants?: ActivityParticipantUpsert[] | null
      replaceParticipants?: boolean
    }) => rpcUpdateActivity(args.id, args.patch, args.participants ?? null, !!args.replaceParticipants),

    onSuccess: () => {
      invalidateFamilyActivities(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[updateActivity] error:', err)
    },
  })
}
