// lib/wishlist/wishlist-settings.hooks.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchWishlistSettings,
    updateWishlistSettings,
} from "./wishlist-settings.api";
import type { WishlistSettings } from "./wishlist-settings.types";
import { useMemo } from "react";
import { usePostgresChangesInvalidate } from "@/lib/realtime";

const key = (familyId?: string) =>
    ["wishlist-settings", familyId ?? null] as const;

/* --------------------------------------------------------
   Load wishlist settings (auto-creates default entry)
-------------------------------------------------------- */
export function useFamilyWishlistSettings(familyId?: string) {
    const settingsRealtime = useMemo(() => {
        if (!familyId) return null;
        return {
            table: "wishlist_settings",
            filter: `family_id=eq.${familyId}`,
            queryKeys: [key(familyId)],
            channel: `rt:wishlist:${familyId}:settings`,
        } as const;
    }, [familyId]);

    usePostgresChangesInvalidate(settingsRealtime);

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
            self_fulfill_max_price?: number | null;
        }) => updateWishlistSettings(familyId!, fields),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key(familyId) });
        },
    });
}
