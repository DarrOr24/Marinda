// lib/activities/activities.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  fetchFamilyActivities,
  rpcCreateActivity,
  rpcDeleteActivity,
  rpcUpdateActivity,
} from './activities.api';
import { mergeActivitiesWithSeriesOccurrences } from './activities.recurrence';
import {
  createActivitySeriesWithParticipants,
  fetchFamilyActivitySeries,
} from './activities.series.api';
import type {
  Activity,
  ActivityInsert,
  ActivityParticipantUpsert,
  ActivityPatch,
  ActivitySeriesInsert,
} from './activities.types';

const activitiesKey = (
  familyId: string | undefined,
  params?: { from?: Date; to?: Date }
) =>
  [
    'activities',
    familyId ?? null,
    params?.from ? params.from.toISOString() : null,
    params?.to ? params.to.toISOString() : null,
  ] as const

const activitySeriesKey = (familyId: string | undefined) =>
  ['activity_series', familyId ?? null] as const

const invalidateFamilyActivities = (
  qc: ReturnType<typeof useQueryClient>,
  familyId?: string
) => {
  if (!familyId) return
  qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey as any[]
      return Array.isArray(k) && k[0] === 'activities' && k[1] === familyId
    },
    refetchType: 'active',
  })
}

export function invalidateActivitySeries(
  qc: ReturnType<typeof useQueryClient>,
  familyId?: string
) {
  if (!familyId) return
  qc.invalidateQueries({
    queryKey: activitySeriesKey(familyId),
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

/**
 * One-off activities plus recurring series expanded into virtual `Activity` rows for the given range.
 */
export function useFamilyCalendarActivities(
  familyId: string | undefined,
  params?: { from?: Date; to?: Date }
) {
  const qActivities = useQuery<Activity[]>({
    queryKey: activitiesKey(familyId, params),
    queryFn: () => fetchFamilyActivities(familyId!, params),
    enabled: !!familyId,
  })

  const qSeries = useQuery({
    queryKey: activitySeriesKey(familyId),
    queryFn: () => fetchFamilyActivitySeries(familyId!),
    enabled: !!familyId,
  })

  const data = useMemo(() => {
    if (!qActivities.data) return undefined
    if (!qSeries.data?.length) return qActivities.data
    if (params?.from && params?.to) {
      return mergeActivitiesWithSeriesOccurrences(
        qActivities.data,
        qSeries.data,
        params.from,
        params.to
      )
    }
    return qActivities.data
  }, [qActivities.data, qSeries.data, params?.from, params?.to])

  return {
    ...qActivities,
    data,
    isLoading: qActivities.isLoading || qSeries.isLoading,
    isFetching: qActivities.isFetching || qSeries.isFetching,
    error: qActivities.error ?? qSeries.error,
  }
}

export function useCreateActivity(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      activity: ActivityInsert
      participants: ActivityParticipantUpsert[]
    }) =>
      rpcCreateActivity(
        args.activity,
        args.participants,
      ),

    onSuccess: () => {
      invalidateFamilyActivities(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[createActivity] error:', err)
    },
  })
}

export function useCreateActivitySeries(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      series: ActivitySeriesInsert
      participants: ActivityParticipantUpsert[]
    }) =>
      createActivitySeriesWithParticipants(args.series, args.participants),

    onSuccess: () => {
      invalidateActivitySeries(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[createActivitySeries] error:', err)
    },
  })
}

export function useUpdateActivity(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      patch: ActivityPatch
      participants?: ActivityParticipantUpsert[] | null
      replaceParticipants?: boolean
    }) =>
      rpcUpdateActivity(
        args.id,
        args.patch,
        args.participants ?? null,
        !!args.replaceParticipants
      ),

    onSuccess: () => {
      invalidateFamilyActivities(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[updateActivity] error:', err)
    },
  })
}

export function useDeleteActivity(familyId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string }) => rpcDeleteActivity(args.id),

    onSuccess: () => {
      invalidateFamilyActivities(qc, familyId)
    },

    onError: (err: any) => {
      console.error('[deleteActivity] error:', err)
    },
  })
}
