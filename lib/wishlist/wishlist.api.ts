// lib/wishlist/wishlist.api.ts
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import { getSupabase } from "../supabase";
import type { WishlistItem } from "./wishlist.types";

const supabase = getSupabase();
const BUCKET = "wishlist-images";

/* --------------------------------------------------------
   Upload SINGLE image for wishlist
-------------------------------------------------------- */
export async function uploadWishlistImage(
    itemId: string,
    localUri: string
): Promise<string | null> {
    if (!localUri) return null;

    const ext = localUri.endsWith(".png") ? "png" : "jpg";
    const mime = ext === "png" ? "image/png" : "image/jpeg";

    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${itemId}/${fileName}`;

    // Read file → base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64",
    } as any);
    const fileData = decode(base64);

    // Upload
    const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, fileData, {
            contentType: mime,
            upsert: true,
            metadata: {
                owner_id: (await supabase.auth.getUser()).data.user?.id ?? "",
            },
        });

    if (uploadErr) throw new Error(uploadErr.message);

    // Get public URL
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data?.publicUrl ?? null;
}

/* --------------------------------------------------------
   Fetch wishlist items for a family
-------------------------------------------------------- */
export async function fetchWishlist(familyId: string) {
    const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as WishlistItem[];
}

/* --------------------------------------------------------
   Add a wishlist item
-------------------------------------------------------- */
export async function addWishlistItem(params: {
    familyId: string;
    memberId: string;
    title: string;
    price?: number | null;
    link?: string | null;
    note?: string | null;
    imageUri?: string | null;
}) {
    const { familyId, memberId, title, price, link, note, imageUri } = params;

    // Create DB row first
    const { data, error } = await supabase
        .from("wishlist_items")
        .insert({
            family_id: familyId,
            member_id: memberId,
            title,
            price: price ?? null,
            link: link ?? null,
            note: note ?? null,
            purchased: false,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    let imageUrl = null;

    if (imageUri) {
        imageUrl = await uploadWishlistImage(data.id, imageUri);

        await supabase
            .from("wishlist_items")
            .update({ image_url: imageUrl })
            .eq("id", data.id);
    }

    return { ...data, image_url: imageUrl };
}

/* --------------------------------------------------------
   Update wishlist item
-------------------------------------------------------- */
export async function updateWishlistItem(
    itemId: string,
    fields: Partial<{
        title: string;
        price: number | null;
        link: string | null;
        note: string | null;
        imageUri: string | null;
    }>
) {
    const patch: any = {};

    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.price !== undefined) patch.price = fields.price;
    if (fields.link !== undefined) patch.link = fields.link ?? null;
    if (fields.note !== undefined) patch.note = fields.note ?? null;

    // Update basic fields first
    const { data, error } = await supabase
        .from("wishlist_items")
        .update(patch)
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    // IMAGE LOGIC (three cases)

    // 1️⃣ Image removed explicitly
    if (fields.imageUri === null) {
        await supabase
            .from("wishlist_items")
            .update({ image_url: null })
            .eq("id", itemId);

        return { ...data, image_url: null };
    }

    // 2️⃣ Image replaced / added
    if (typeof fields.imageUri === "string") {
        const url = await uploadWishlistImage(itemId, fields.imageUri);
        await supabase
            .from("wishlist_items")
            .update({ image_url: url })
            .eq("id", itemId);

        return { ...data, image_url: url };
    }

    // 3️⃣ Image untouched
    return data;

}

/* --------------------------------------------------------
   Delete wishlist item
-------------------------------------------------------- */
export async function deleteWishlistItem(itemId: string) {
    const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", itemId);

    if (error) throw new Error(error.message);
    return true;
}

/* --------------------------------------------------------
   Mark as purchased
-------------------------------------------------------- */
export async function markWishlistPurchased(itemId: string) {
    const { data, error } = await supabase
        .from("wishlist_items")
        .update({ purchased: true })
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}
