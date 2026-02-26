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

        const trimmedTitle = input.title.trim();

        // Check for existing template with same name (case-insensitive) to avoid duplicates
        const { data: existing } = await supabase
            .from("chore_templates")
            .select("id, title, default_points, created_by_id, is_archived, created_at, updated_at, family_id")
            .eq("family_id", familyId)
            .eq("is_archived", false)
            .ilike("title", trimmedTitle)
            .maybeSingle();

        if (existing) {
            // Update existing template instead of creating duplicate
            const { data, error } = await supabase
                .from("chore_templates")
                .update({
                    default_points: input.defaultPoints,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id)
                .select("*")
                .single();

            if (error || !data) {
                throw error ?? new Error("Failed to update template");
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

            setTemplates((prev) =>
                prev.map((t) => (t.id === template.id ? template : t))
            );
            return template;
        }

        const { data, error } = await supabase
            .from("chore_templates")
            .insert({
                family_id: familyId,
                title: trimmedTitle,
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
