import { getSupabase } from '../supabase';

import type { ListTab } from './list-tabs.types';

const supabase = getSupabase();

function mapTabRow(row: Record<string, unknown>): ListTab {
  const label = String(row.label ?? '').trim();
  const rawShares = row.list_tab_shares as { member_id: string }[] | null | undefined;
  const shareMemberIds = Array.isArray(rawShares)
    ? rawShares.map((s) => s.member_id).filter(Boolean)
    : [];

  return {
    id: String(row.id),
    label,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    shareMemberIds,
  };
}

export async function fetchListTabs(familyId: string) {
  const { data, error } = await supabase
    .from('list_tabs')
    .select('*, list_tab_shares(member_id)')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapTabRow(r as Record<string, unknown>));
}

export async function replaceListTabShares(listTabId: string, memberIds: string[]) {
  const uniq = [...new Set(memberIds)].filter(Boolean);
  const { error: delErr } = await supabase
    .from('list_tab_shares')
    .delete()
    .eq('list_tab_id', listTabId);

  if (delErr) throw new Error(delErr.message);
  if (!uniq.length) return;

  const { error: insErr } = await supabase.from('list_tab_shares').insert(
    uniq.map((member_id) => ({ list_tab_id: listTabId, member_id })),
  );

  if (insErr) throw new Error(insErr.message);
}

export async function createListTab(params: {
  familyId: string;
  label: string;
  /** Optional; RLS requires parent for `list_tab_shares` rows. */
  shareMemberIds?: string[];
}) {
  const { familyId, label, shareMemberIds = [] } = params;
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
  const tab = mapTabRow({ ...(data as Record<string, unknown>), list_tab_shares: [] });

  const shares = [...new Set(shareMemberIds)].filter(Boolean);
  if (shares.length) {
    await replaceListTabShares(tab.id, shares);
    return { ...tab, shareMemberIds: shares };
  }

  return tab;
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
    .select('*, list_tab_shares(member_id)')
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
