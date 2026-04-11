import { getSupabase } from '../supabase';
import { deleteGroceryItemsForListKind } from './groceries.api';
import type { ShoppingTab } from './shopping.types';

const supabase = getSupabase();

function mapTabRow(row: any): ShoppingTab {
  const label = String(row.label ?? '').trim();
  return {
    id: row.id,
    label,
    placeholder: row.placeholder?.trim() || `Add to ${label}…`,
    emptyText: `No ${label.toLowerCase()} on the list yet.`,
    sort_order: row.sort_order ?? 0,
    created_by_member_id: row.created_by_member_id ?? null,
  };
}

export async function fetchShoppingTabs(familyId: string) {
  const { data, error } = await supabase
    .from('shopping_tabs')
    .select('*')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTabRow);
}

export async function createShoppingTab(params: {
  familyId: string;
  label: string;
  placeholder?: string;
  createdByMemberId: string;
}) {
  const { familyId, label, placeholder, createdByMemberId } = params;
  const trimmed = label.trim();
  if (!trimmed) throw new Error('List name is required');

  const { data, error } = await supabase
    .from('shopping_tabs')
    .insert({
      family_id: familyId,
      label: trimmed,
      placeholder: placeholder?.trim() || null,
      created_by_member_id: createdByMemberId,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create list');
  return mapTabRow(data);
}

export async function updateShoppingTab(id: string, params: { label: string }) {
  const trimmed = params.label.trim();
  if (!trimmed) throw new Error('List name is required');

  const { data, error } = await supabase
    .from('shopping_tabs')
    .update({
      label: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update list');
  return mapTabRow(data);
}

/** Deletes the tab row and all items whose `list_kind` equals this tab’s id. */
export async function deleteShoppingTab(familyId: string, tabId: string) {
  await deleteGroceryItemsForListKind(familyId, tabId);
  const { error } = await supabase.from('shopping_tabs').delete().eq('id', tabId);
  if (error) throw new Error(error.message);
}
