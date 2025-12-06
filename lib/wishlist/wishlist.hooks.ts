// lib/wishlist/wishlist.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addWishlistItem,
    deleteWishlistItem,
    fetchWishlist,
    markWishlistPurchased,
    updateWishlistItem,
} from "./wishlist.api";
import type { WishlistItem } from "./wishlist.types";

const wishlistKey = (familyId?: string) =>
    ["wishlist", familyId ?? null] as const;

/* --------------------------------------------------------
   Load wishlist items for a family
-------------------------------------------------------- */
export function useWishlist(familyId?: string) {
    return useQuery<WishlistItem[]>({
        queryKey: wishlistKey(familyId),
        enabled: !!familyId,
        queryFn: () => fetchWishlist(familyId!),
    });
}

/* --------------------------------------------------------
   Add item
-------------------------------------------------------- */
export function useAddWishlistItem(familyId?: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: addWishlistItem,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wishlistKey(familyId) });
        },
    });
}

/* --------------------------------------------------------
   Update item
-------------------------------------------------------- */
export function useUpdateWishlistItem(familyId?: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
            itemId,
            fields,
        }: {
            itemId: string;
            fields: any;
        }) => updateWishlistItem(itemId, fields),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wishlistKey(familyId) });
        },
    });
}

/* --------------------------------------------------------
   Delete item
-------------------------------------------------------- */
export function useDeleteWishlistItem(familyId?: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: deleteWishlistItem,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wishlistKey(familyId) });
        },
    });
}

/* --------------------------------------------------------
   Mark purchased
-------------------------------------------------------- */
export function useMarkWishlistPurchased(familyId?: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: markWishlistPurchased,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wishlistKey(familyId) });
        },
    });
}
