// lib/members/members.api.ts
import { decode } from 'base64-arraybuffer'
import * as FileSystem from 'expo-file-system/legacy'

import { getSupabase } from '@/lib/supabase'
import { FamilyMember } from './members.types'


const supabase = getSupabase()

const BUCKET = 'profile-photos'

export async function fetchMember(memberId: string): Promise<FamilyMember> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (error) throw new Error(error.message)
  return data as FamilyMember
}

export async function updateMember(
  memberId: string,
  updates: Partial<FamilyMember>,
): Promise<FamilyMember> {
  const { data, error } = await supabase
    .from('family_members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as FamilyMember
}

export function getMemberAvatarPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadMemberAvatar(memberId: string, fileUri: string) {
  // 1) read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  // 2) convert to binary buffer
  const fileBuffer = decode(base64)

  // 3) upload
  const path = `members/${memberId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, {
      upsert: true,
      contentType: 'image/jpeg',
    })

  if (uploadError) throw uploadError

  // 4) save path on family_members
  const { error: dbError } = await supabase
    .from('family_members')
    .update({ avatar_url: path })
    .eq('id', memberId)

  if (dbError) throw dbError

  return path
}
