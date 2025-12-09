import { getSupabase } from "../supabase";

const supabase = getSupabase();

/* --------------------------------------------------------
   Fetch wishlist settings for a family
   - If row does NOT exist → automatically create default settings
-------------------------------------------------------- */
export async function fetchWishlistSettings(familyId: string) {
    if (!familyId) throw new Error("familyId is required");

    // Load settings safely (never throws on "no rows")
    const { data, error } = await supabase
        .from("wishlist_settings")
        .select("*")
        .eq("family_id", familyId)
        .maybeSingle(); // <<< FIXED

    // If settings already exist → return
    if (data) return data;

    // If there was an actual error (not "no rows")
    if (error && error.code !== "PGRST116") {
        throw new Error(error.message);
    }

    // Otherwise create default settings
    const defaultSettings = {
        family_id: familyId,
        currency: "CAD",
        points_per_currency: 10,
    };

    const { data: inserted, error: insertErr } = await supabase
        .from("wishlist_settings")
        .insert(defaultSettings)
        .select()
        .single();

    if (insertErr) throw new Error(insertErr.message);

    return inserted;
}

/* --------------------------------------------------------
   Update wishlist settings
   - Only parents (MOM / DAD) can update (RLS enforces this)
-------------------------------------------------------- */
export async function updateWishlistSettings(
    familyId: string,
    fields: Partial<{
        currency: string;
        points_per_currency: number;
    }>
) {
    if (!familyId) throw new Error("familyId is required");

    const patch: any = {};

    if (fields.currency !== undefined) patch.currency = fields.currency;
    if (fields.points_per_currency !== undefined)
        patch.points_per_currency = fields.points_per_currency;

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from("wishlist_settings")
        .update(patch)
        .eq("family_id", familyId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return data;
}
