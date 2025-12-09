// lib/wishlist/wishlist-settings.hooks.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchWishlistSettings,
    updateWishlistSettings,
} from "./wishlist-settings.api";
import type { WishlistSettings } from "./wishlist-settings.types";

const key = (familyId?: string) =>
    ["wishlist-settings", familyId ?? null] as const;

/* --------------------------------------------------------
   Load wishlist settings (auto-creates default entry)
-------------------------------------------------------- */
export function useFamilyWishlistSettings(familyId?: string) {
    return useQuery<WishlistSettings>({
        queryKey: key(familyId),
        queryFn: () => fetchWishlistSettings(familyId!),
        enabled: !!familyId,
    });
}

/* --------------------------------------------------------
   Update wishlist settings
-------------------------------------------------------- */
export function useUpdateWishlistSettings(familyId?: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (fields: {
            currency?: string;
            points_per_currency?: number;
        }) => updateWishlistSettings(familyId!, fields),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key(familyId) });
        },
    });
}
