// lib/realtime.ts
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'

type Opts = {
  schema?: string
  table: string
  filter?: string
  queryKeys: readonly QueryKey[]
  channel?: string
}

export function usePostgresChangesInvalidate(opts?: Opts | null) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!opts) return

    const { schema = 'public', table, filter, queryKeys, channel } = opts
    if (!table || queryKeys.length === 0) return

    const supabase = getSupabase()
    const topic = channel ?? `rt:${schema}:${table}:${filter ?? 'all'}`

    for (const existing of supabase.getChannels()) {
      if (existing.topic === `realtime:${topic}`) {
        supabase.removeChannel(existing)
      }
    }

    const invalidate = () => {
      for (const queryKey of queryKeys) {
        qc.invalidateQueries({ queryKey, refetchType: 'active' })
      }
    }

    const withFilter = filter
      ? { schema, table, filter, event: '*' as const }
      : { schema, table, event: '*' as const }

    const ch = supabase
      .channel(topic)
      .on('postgres_changes', withFilter, invalidate)
      .subscribe((status) => {
        if (__DEV__) console.log('[RT]', topic, status)
      })


    return () => {
      supabase.removeChannel(ch)
    }
  }, [qc, opts])
}
