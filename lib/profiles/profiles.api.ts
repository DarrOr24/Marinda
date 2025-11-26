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

    const path = `${profileId}.jpg`;

    const formData = new FormData();
    formData.append("file", {
        uri: fileUri,
        name: `${profileId}.jpg`,
        type: "image/jpeg",
    } as any);

    const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, formData, {
            upsert: true,
            contentType: "image/jpeg",
        });

    if (uploadError) {
        console.log("UPLOAD ERROR", uploadError);
        throw uploadError;
    }

    const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", profileId);

    if (dbErr) {
        console.log("DB ERROR", dbErr);
        throw dbErr;
    }

    console.log("UPLOAD + DB SAVE SUCCESS");
    return path;
}
