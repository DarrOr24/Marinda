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
    // read file as Blob
    const file = await fetch(fileUri).then(r => r.blob())

    // path inside bucket
    const path = `${profileId}.jpg`

    // upload (upsert allowed by policy)
    const { error } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, {
            upsert: true,
            contentType: 'image/jpeg',
        })

    if (error) throw error

    // save DB ref
    const { error: err2 } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', profileId)

    if (err2) throw err2

    return path
}
