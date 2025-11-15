// lib/points/points.api.ts
import { getSupabase } from '../supabase';

const supabase = getSupabase();

export type PointsEntry = {
    id: string;
    delta: number;
    reason: string | null;
    created_at: string;
    kind: string | null;
};

export async function fetchMemberPointsHistory(
    familyId: string,
    memberId: string,
    limit = 10
): Promise<PointsEntry[]> {
    const { data, error } = await supabase
        .from('points_ledger')
        .select('id, delta, reason, created_at, kind')
        .eq('family_id', familyId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as PointsEntry[];
}
