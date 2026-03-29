// lib/groceries/groceries.api.ts
import { getSupabase } from '../supabase';

const supabase = getSupabase();

export type GroceryRow = {
  id: string;
  family_id: string;
  text: string;
  category: string | null;
  list_kind: string;
  added_by_member_id: string;
  purchased: boolean;
  purchased_at: string | null;
  created_at: string;
  amount: string | null;
};

export async function fetchGroceryItems(familyId: string) {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GroceryRow[];
}

export async function addGroceryItem(input: {
  familyId: string;
  text: string;
  category?: string;
  listKind?: string;
  amount?: string | null;
  addedByMemberId: string;
}) {
  const { data, error } = await supabase
    .from('grocery_items')
    .insert({
      family_id: input.familyId,
      text: input.text,
      category: input.category ?? null,
      list_kind: input.listKind?.trim() || 'groceries',
      amount: input.amount ?? null,
      added_by_member_id: input.addedByMemberId,
      purchased: false,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to add grocery item');
  return data as GroceryRow;
}

export async function updateGroceryPurchased(id: string, purchased: boolean) {
  const { data, error } = await supabase
    .from('grocery_items')
    .update({
      purchased,
      purchased_at: purchased ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update grocery item');
  return data as GroceryRow;
}

export async function deleteGroceryItems(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('grocery_items').delete().in('id', ids);

  if (error) throw new Error(error.message);
}

/** Remove every item on a list (used when deleting a custom tab; `listKind` is tab uuid or built-in slug). */
export async function deleteGroceryItemsForListKind(familyId: string, listKind: string) {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('family_id', familyId)
    .eq('list_kind', listKind);

  if (error) throw new Error(error.message);
}

export async function updateGroceryItem(
  id: string,
  input: {
    text: string;
    category?: string;
    listKind?: string;
    amount?: string | null;
  },
) {
  const { data, error } = await supabase
    .from('grocery_items')
    .update({
      text: input.text,
      category: input.category ?? null,
      list_kind: input.listKind?.trim() || 'groceries',
      amount: input.amount ?? null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update grocery item');
  return data as GroceryRow;
}
