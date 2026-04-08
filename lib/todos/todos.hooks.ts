import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { usePostgresChangesInvalidate } from '@/lib/realtime'

import { fetchTodoItems, type TodoItemRow } from './todos.api'

export const todoItemsKey = (familyId?: string) =>
  ['todo-items', familyId ?? null] as const

export function useFamilyTodoItems(familyId?: string) {
  const itemsRealtime = useMemo(() => {
    if (!familyId) return null
    return {
      table: 'todo_items',
      filter: `family_id=eq.${familyId}`,
      queryKeys: [todoItemsKey(familyId)],
      channel: `rt:todos:${familyId}:items`,
    } as const
  }, [familyId])
  const sharesRealtime = useMemo(() => {
    if (!familyId) return null
    return {
      table: 'todo_item_shares',
      queryKeys: [todoItemsKey(familyId)],
      channel: `rt:todos:${familyId}:shares`,
    } as const
  }, [familyId])

  usePostgresChangesInvalidate(itemsRealtime)
  usePostgresChangesInvalidate(sharesRealtime)

  return useQuery<TodoItemRow[]>({
    queryKey: todoItemsKey(familyId),
    queryFn: () => fetchTodoItems(familyId!),
    enabled: !!familyId,
  })
}
