// lib/announcements/announcements.api.ts
import { getSupabase } from '../supabase';
import type {
    AnnouncementCategory,
    AnnouncementItem,
    AnnouncementKind,
} from './announcements.types';

const supabase = getSupabase();

/* ---------------------------------------------------------
   ANNOUNCEMENT ITEMS
--------------------------------------------------------- */

/** Map DB row → front-end announcement item */
function mapRow(row: any): AnnouncementItem {
    return {
        id: row.id,
        family_id: row.family_id,
        created_by_member_id: row.created_by_member_id,
        kind: row.kind,
        category: row.category,
        text: row.text,
        week_start: row.week_start,
        completed: row.completed,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/** Fetch ALL announcements for the family */
export async function fetchAnnouncements(familyId: string) {
    const { data, error } = await supabase
        .from('announcement_items')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
}

/** Fetch announcements only for a specific week */
export async function fetchAnnouncementsForWeek(
    familyId: string,
    weekStart: string
) {
    const { data, error } = await supabase
        .from('announcement_items')
        .select('*')
        .eq('family_id', familyId)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
}

/** Add new announcement */
export async function addAnnouncement(params: {
    familyId: string;
    createdByMemberId: string;

    kind: AnnouncementKind;
    category?: AnnouncementCategory;

    text: string;
    weekStart?: string | null;
}) {
    const { familyId, createdByMemberId, kind, category, text, weekStart } = params;

    const { data, error } = await supabase
        .from('announcement_items')
        .insert({
            family_id: familyId,
            created_by_member_id: createdByMemberId,
            kind,
            category: category ?? null,
            text,
            week_start: weekStart ?? null,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapRow(data);
}

/** Update announcement */
export async function updateAnnouncement(
    id: string,
    updates: {
        text?: string;
        category?: AnnouncementCategory;
        weekStart?: string | null;
    }
) {
    const patch: any = {};
    if (updates.text !== undefined) patch.text = updates.text;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.weekStart !== undefined) patch.week_start = updates.weekStart;

    const { data, error } = await supabase
        .from('announcement_items')
        .update({
            ...patch,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapRow(data);
}

/** Delete announcement */
export async function deleteAnnouncement(id: string) {
    const { error } = await supabase
        .from('announcement_items')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
}

/** Toggle completed */
export async function toggleAnnouncementCompleted(id: string, completed: boolean) {
    const { data, error } = await supabase
        .from('announcement_items')
        .update({ completed })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapRow(data);
}

/* ---------------------------------------------------------
   ANNOUNCEMENT TABS
--------------------------------------------------------- */

/** Map DB row → tab object */
function mapTabRow(row: any) {
    return {
        id: row.id,
        label: row.label,
        placeholder: row.placeholder ?? '',
        emptyText: `No ${row.label.toLowerCase()} yet.`,
        sort_order: row.sort_order ?? 0,
    };
}

/** Fetch tabs */
export async function fetchAnnouncementTabs(familyId: string) {
    const { data, error } = await supabase
        .from('announcement_tabs')
        .select('*')
        .eq('family_id', familyId)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTabRow);
}

/** Create tab */
export async function createAnnouncementTab(params: {
    familyId: string;
    label: string;
    placeholder?: string;
}) {
    const { familyId, label, placeholder } = params;

    const { data, error } = await supabase
        .from('announcement_tabs')
        .insert({
            family_id: familyId,
            label,
            placeholder: placeholder ?? null,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapTabRow(data);
}

/** Update tab */
export async function updateAnnouncementTab(
    id: string,
    updates: { label?: string; placeholder?: string }
) {
    const patch: any = {};
    if (updates.label !== undefined) patch.label = updates.label;
    if (updates.placeholder !== undefined) patch.placeholder = updates.placeholder;

    const { data, error } = await supabase
        .from('announcement_tabs')
        .update({
            ...patch,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapTabRow(data);
}

/** Delete tab */
export async function deleteAnnouncementTab(id: string) {
    const { error } = await supabase
        .from('announcement_tabs')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
}
