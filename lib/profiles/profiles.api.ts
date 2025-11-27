// lib/profiles/profiles.api.ts
import { getSupabase } from '../supabase'

const supabase = getSupabase()

export async function fetchProfile(profileId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function updateProfile(profileId: string, updates: any) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function uploadAvatar(profileId: string, fileUri: string) {
    console.log("UPLOAD START", { profileId, fileUri });

    const file = await fetch(fileUri);
    const blob = await file.blob();

    const path = `${profileId}.jpg`;
    console.log("UPLOAD PATH:", path);

    const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, {
            upsert: true,
            contentType: "image/jpeg",
        });

    if (uploadError) {
        console.log("UPLOAD ERROR:", uploadError);
        throw uploadError;
    }

    console.log("UPLOAD SUCCESS:", path);

    // Update DB
    const { data, error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", profileId)
        .select()
        .single();

    if (dbErr) {
        console.log("DB ERROR:", dbErr);
        throw dbErr;
    }

    console.log("DB UPDATED. NEW PROFILE:", data);

    return path;
}

export function getAvatarPublicUrl(path: string | null): string | null {
    if (!path) return null;

    const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

    return data?.publicUrl ?? null;
}
