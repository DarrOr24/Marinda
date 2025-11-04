import { type QueryClient } from '@tanstack/react-query'
import { getSupabase } from './supabase'


export function subscribeTableByFamily(
  qc: QueryClient,
  table: string,
  familyId: string,
  queryKey: (string | number)[]
) {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`rt:${table}:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
      () => qc.invalidateQueries({ queryKey })
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
