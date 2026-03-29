// lib/todos/todos.api.ts
import { getSupabase } from '../supabase';

const supabase = getSupabase();

export type TodoShareRow = { member_id: string };

export type TodoItemRow = {
  id: string;
  family_id: string;
  text: string;
  created_by_member_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Built-in `todos` or a custom tab uuid string. */
  list_kind?: string;
  todo_item_shares?: TodoShareRow[] | null;
};

export async function fetchTodoItems(familyId: string) {
  const { data, error } = await supabase
    .from('todo_items')
    .select('*, todo_item_shares(member_id)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TodoItemRow[];
}

export async function addTodoItem(input: {
  familyId: string;
  text: string;
  createdByMemberId: string;
  listKind?: string;
}) {
  const { data, error } = await supabase.rpc('insert_todo_item', {
    p_family_id: input.familyId,
    p_text: input.text,
    p_created_by_member_id: input.createdByMemberId,
    p_list_kind: input.listKind ?? 'todos',
  });

  if (error || !data) throw new Error(error?.message || 'Failed to add to-do');

  const row = data as Record<string, unknown>;
  return {
    id: row.id,
    family_id: row.family_id,
    text: row.text,
    created_by_member_id: row.created_by_member_id,
    completed: row.completed,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    list_kind: (row.list_kind as string) ?? 'todos',
    todo_item_shares: [],
  } as TodoItemRow;
}

export async function updateTodoCompleted(id: string, completed: boolean) {
  const { data, error } = await supabase
    .from('todo_items')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*, todo_item_shares(member_id)')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update to-do');
  return data as TodoItemRow;
}

export async function updateTodoText(id: string, text: string, listKind?: string) {
  const patch: { text: string; list_kind?: string } = { text };
  if (listKind !== undefined) {
    patch.list_kind = listKind.trim() || 'todos';
  }
  const { data, error } = await supabase
    .from('todo_items')
    .update(patch)
    .eq('id', id)
    .select('*, todo_item_shares(member_id)')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update to-do');
  return data as TodoItemRow;
}

export async function deleteTodoItems(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('todo_items').delete().in('id', ids);

  if (error) throw new Error(error.message);
}

export async function replaceTodoItemShares(todoItemId: string, memberIds: string[]) {
  const uniq = [...new Set(memberIds)];
  const { error: delErr } = await supabase
    .from('todo_item_shares')
    .delete()
    .eq('todo_item_id', todoItemId);

  if (delErr) throw new Error(delErr.message);
  if (!uniq.length) return;

  const { error: insErr } = await supabase.from('todo_item_shares').insert(
    uniq.map((member_id) => ({ todo_item_id: todoItemId, member_id })),
  );

  if (insErr) throw new Error(insErr.message);
}
