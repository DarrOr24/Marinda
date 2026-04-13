import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { usePostgresChangesInvalidate } from '@/lib/realtime'

import { fetchListTabs } from './list-tabs.api'
import type { ListTab } from './list-tabs.types'

export const listTabsKey = (familyId?: string) =>
  ['list-tabs', familyId ?? null] as const

export function useFamilyListTabs(familyId?: string) {
  const listTabsRealtime = useMemo(() => {
    if (!familyId) return null
    return {
      table: 'list_tabs',
      filter: `family_id=eq.${familyId}`,
      queryKeys: [listTabsKey(familyId)],
      channel: `rt:list-tabs:${familyId}`,
    } as const
  }, [familyId])

  const listTabSharesRealtime = useMemo(() => {
    if (!familyId) return null
    return {
      table: 'list_tab_shares',
      queryKeys: [listTabsKey(familyId)],
      channel: `rt:list-tab-shares:${familyId}`,
    } as const
  }, [familyId])

  usePostgresChangesInvalidate(listTabsRealtime)
  usePostgresChangesInvalidate(listTabSharesRealtime)

  return useQuery<ListTab[]>({
    queryKey: listTabsKey(familyId),
    queryFn: () => fetchListTabs(familyId!),
    enabled: !!familyId,
  })
}
