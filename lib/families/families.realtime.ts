// lib/families/families.realtime.ts
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { getSupabase } from '../supabase'

export function useSubscribeTableByFamily(
  table: string,
  familyId?: string | null,
  queryKey?: QueryKey
) {
  const qc = useQueryClient()

  const keyHash = useMemo(() => (queryKey ? JSON.stringify(queryKey) : ''), [queryKey])

  useEffect(() => {
    if (!familyId || !queryKey?.length) return

    const supabase = getSupabase()

    const channel = supabase
      .channel(`rt:${table}:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
        () => qc.invalidateQueries({ queryKey, refetchType: 'active' })
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [familyId, table, qc, keyHash])
}
