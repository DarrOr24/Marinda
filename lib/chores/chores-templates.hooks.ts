import { useEffect, useState } from "react";
import { getSupabase } from '../supabase';
import type { ChoreTemplate } from "./chores.types";

const supabase = getSupabase();

export function useChoreTemplates(familyId?: string) {
    const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!familyId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("chore_templates")
                .select("*")
                .eq("family_id", familyId)
                .eq("is_archived", false)
                .order("title", { ascending: true });

            if (cancelled) return;

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            const mapped: ChoreTemplate[] = (data ?? []).map((row: any) => ({
                id: row.id,
                familyId: row.family_id,
                title: row.title,
                defaultPoints: row.default_points,
                createdById: row.created_by_id,
                isArchived: row.is_archived,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            setTemplates(mapped);
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [familyId]);

    async function createTemplate(input: {
        title: string;
        defaultPoints: number;
        createdById?: string;
    }) {
        if (!familyId) return null;

        const { data, error } = await supabase
            .from("chore_templates")
            .insert({
                family_id: familyId,
                title: input.title.trim(),
                default_points: input.defaultPoints,
                created_by_id: input.createdById ?? null,
            })
            .select("*")
            .single();

        if (error || !data) {
            throw error ?? new Error("Failed to create template");
        }

        const template: ChoreTemplate = {
            id: data.id,
            familyId: data.family_id,
            title: data.title,
            defaultPoints: data.default_points,
            createdById: data.created_by_id,
            isArchived: data.is_archived,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        setTemplates((prev) => [...prev, template]);
        return template;
    }

    async function deleteTemplate(id: string) {
        const { error } = await supabase
            .from("chore_templates")
            .update({ is_archived: true })
            .eq("id", id);

        if (error) throw new Error(error.message);

        setTemplates((prev) => prev.filter((t) => t.id !== id));
    }

    return { templates, loading, error, createTemplate, deleteTemplate };
}
