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
    limit = 50,
    since?: string
): Promise<PointsEntry[]> {
    let query = supabase
        .from('points_ledger')
        .select('id, delta, reason, created_at, kind')
        .eq('family_id', familyId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (since) {
        query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as PointsEntry[];
}

export async function adjustMemberPoints({
    familyId,
    memberId,
    delta,
    reason,
    approverMemberId,
}: {
    familyId: string;
    memberId: string;
    delta: number;
    reason: string;
    approverMemberId: string | null;
}) {
    // 1) Get current points
    const { data: memberRow, error: fetchErr } = await supabase
        .from("family_members")
        .select("points")
        .eq("id", memberId)
        .single();

    if (fetchErr) throw fetchErr;

    const currentPoints = memberRow?.points ?? 0;
    const newPoints = currentPoints + delta;

    // 2) Update member points
    const { error: updateErr } = await supabase
        .from("family_members")
        .update({ points: newPoints })
        .eq("id", memberId);

    if (updateErr) throw updateErr;

    // 3) Insert ledger entry
    const { error: insertErr } = await supabase
        .from("points_ledger")
        .insert({
            family_id: familyId,
            member_id: memberId,
            delta,
            reason,
            kind: "manual_adjust",
            approved_by_member_id: approverMemberId,
        });

    if (insertErr) throw insertErr;

    return true;
}
