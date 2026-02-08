import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import { awardMemberPoints } from "@/lib/families/families.api";
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
    fulfillmentMode?: "parents" | "self";
    paymentMethod?: string | null;
}) {
    const {
        familyId,
        memberId,
        title,
        price,
        link,
        note,
        imageUri,
        fulfillmentMode = "parents",
        paymentMethod = null,
    } = params;

    const { data, error } = await supabase
        .from("wishlist_items")
        .insert({
            family_id: familyId,
            member_id: memberId,
            title,
            price: price ?? null,
            link: link ?? null,
            note: note ?? null,
            status: "open",
            fulfillment_mode: fulfillmentMode,
            payment_method: fulfillmentMode === "self" ? paymentMethod : null,
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

        fulfillment_mode: "parents" | "self";
        payment_method: string | null;
    }>
) {
    const patch: any = {};

    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.price !== undefined) patch.price = fields.price;
    if (fields.link !== undefined) patch.link = fields.link ?? null;
    if (fields.note !== undefined) patch.note = fields.note ?? null;

    if (fields.fulfillment_mode !== undefined) {
        patch.fulfillment_mode = fields.fulfillment_mode;
        patch.payment_method =
            fields.fulfillment_mode === "self" ? fields.payment_method ?? null : null;
    }

    // 1) Update non-image fields first
    const { data, error } = await supabase
        .from("wishlist_items")
        .update(patch)
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    // Helpers (local vs remote)
    const isRemoteUrl = (uri?: string | null) => !!uri && /^https?:\/\//.test(uri);
    const isLocalFile = (uri?: string | null) => !!uri && uri.startsWith("file://");

    // 2) IMAGE HANDLING
    // Case A: Explicitly removing image
    if (fields.imageUri === null) {
        const { error: imgErr } = await supabase
            .from("wishlist_items")
            .update({ image_url: null })
            .eq("id", itemId);

        if (imgErr) throw new Error(imgErr.message);

        return { ...data, image_url: null };
    }

    // Case B: imageUri provided as a string
    if (typeof fields.imageUri === "string") {
        // If it's already a remote/public URL, do NOT upload/read it.
        // Just keep it as-is (and no extra DB write needed).
        if (isRemoteUrl(fields.imageUri)) {
            return { ...data, image_url: fields.imageUri };
        }

        // Only upload if it's a local file picked from device (file://...)
        if (isLocalFile(fields.imageUri)) {
            const url = await uploadWishlistImage(itemId, fields.imageUri);

            const { error: imgErr } = await supabase
                .from("wishlist_items")
                .update({ image_url: url })
                .eq("id", itemId);

            if (imgErr) throw new Error(imgErr.message);

            return { ...data, image_url: url };
        }

        // Unknown string format (neither http nor file) - ignore safely
        return data;
    }

    // Case C: imageUri not provided => unchanged
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
    const user = await supabase.auth.getUser();

    // 1️⃣ Mark wishlist item as fulfilled
    const { data, error } = await supabase
        .from("wishlist_items")
        .update({
            status: "fulfilled",
            fulfilled_by: user.data.user?.id ?? null,
            fulfilled_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw new Error(error.message);

    // 2️⃣ Deduct points (if price exists)
    if (data.price && data.price > 0) {
        const { data: settings, error: settingsErr } = await supabase
            .from("wishlist_settings")
            .select("points_per_currency")
            .eq("family_id", data.family_id)
            .single();

        if (settingsErr) throw new Error(settingsErr.message);

        const points = Math.round(data.price * (settings?.points_per_currency ?? 10));

        if (points > 0) {
            // ✅ Ledger entry (this is what makes it show up in Profile history)
            const { error: ledgerErr } = await supabase.from("points_ledger").insert({
                family_id: data.family_id,
                member_id: data.member_id,
                delta: -points,
                reason: `Fulfilled wish: ${data.title}`,
                kind: "wishlist_spend",
            });

            if (ledgerErr) throw new Error(ledgerErr.message);

            // ✅ Apply balance change
            await awardMemberPoints(data.member_id, -points);
        }
    }

    return data;
}



