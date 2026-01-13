// lib/profiles/profiles.api.ts
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { getSupabase } from "../supabase";

import { type Profile } from "./profiles.types";

const supabase = getSupabase();

export async function fetchProfile(profileId: string): Promise<Profile> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function fetchProfileByAuthUserId(authUserId: string): Promise<Profile> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function updateProfile(profileId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profileId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function uploadAvatar(profileId: string, fileUri: string) {
    console.log("UPLOAD START", { profileId, fileUri });

    // 1️⃣ Read as base64 (works for all Expo versions)
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // 2️⃣ Convert to binary buffer
    const fileBuffer = decode(base64);

    const path = `${profileId}.jpg`;

    // 3️⃣ Upload to Supabase
    const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, fileBuffer, {
            upsert: true,
            contentType: "image/jpeg",
        });

    if (uploadError) {
        console.log("UPLOAD ERROR:", uploadError);
        throw uploadError;
    }

    // 4️⃣ Save path in DB
    const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", profileId);

    if (dbError) {
        console.log("DB ERROR:", dbError);
        throw dbError;
    }

    console.log("UPLOAD SUCCESS");
    return path;
}

export function getAvatarPublicUrl(path: string | null): string | null {
    if (!path) return null;

    const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

    // Add timestamp to force refresh
    return `${data.publicUrl}?t=${Date.now()}`;
}

