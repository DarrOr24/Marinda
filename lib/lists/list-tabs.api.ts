import { getSupabase } from '../supabase';

import type { ListTab } from './list-tabs.types';

const supabase = getSupabase();

function mapTabRow(row: Record<string, unknown>): ListTab {
  const label = String(row.label ?? '').trim();
  return {
    id: String(row.id),
    label,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
  };
}

export async function fetchListTabs(familyId: string) {
  const { data, error } = await supabase
    .from('list_tabs')
    .select('*')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapTabRow(r as Record<string, unknown>));
}

export async function createListTab(params: { familyId: string; label: string }) {
  const { familyId, label } = params;
  const trimmed = label.trim();
  if (!trimmed) throw new Error('List name is required');

  const { data, error } = await supabase
    .from('list_tabs')
    .insert({
      family_id: familyId,
      label: trimmed,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create list');
  return mapTabRow(data as Record<string, unknown>);
}

export async function updateListTab(id: string, params: { label: string }) {
  const trimmed = params.label.trim();
  if (!trimmed) throw new Error('List name is required');

  const { data, error } = await supabase
    .from('list_tabs')
    .update({
      label: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update list');
  return mapTabRow(data as Record<string, unknown>);
}

/** Parents only (RPC): removes all items on the list, then the tab row. */
export async function deleteListTab(familyId: string, tabId: string) {
  const { error: rpcErr } = await supabase.rpc('delete_list_tab', {
    p_tab_id: tabId,
    p_family_id: familyId,
  });
  if (rpcErr) throw new Error(rpcErr.message);
}
