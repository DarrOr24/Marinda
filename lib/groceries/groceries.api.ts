// lib/groceries/groceries.api.ts
import { getSupabase } from '../supabase';

const supabase = getSupabase();

export type GroceryRow = {
    id: string;
    family_id: string;
    text: string;
    category: string | null;
    added_by_member_id: string;
    purchased: boolean;
    purchased_at: string | null;
    created_at: string;
};

// Load all grocery items for a family
export async function fetchGroceryItems(familyId: string) {
    const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as GroceryRow[];
}

// Add a new grocery item
export async function addGroceryItem(input: {
    familyId: string;
    text: string;
    category?: string;
    addedByMemberId: string;
}) {
    const { data, error } = await supabase
        .from('grocery_items')
        .insert({
            family_id: input.familyId,
            text: input.text,
            category: input.category ?? null,
            added_by_member_id: input.addedByMemberId,
            purchased: false,
        })
        .select('*')
        .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add grocery item');
    return data as GroceryRow;
}

// Toggle purchased flag
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

// Delete many items by id
export async function deleteGroceryItems(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase
        .from('grocery_items')
        .delete()
        .in('id', ids);

    if (error) throw new Error(error.message);
}
