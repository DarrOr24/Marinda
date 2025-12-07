// lib/families/families.api.ts
import { MEMBER_WITH_PROFILE_SELECT } from '../members/members.select'
import { getSupabase } from '../supabase'
import { Member, Role } from './families.types'

const supabase = getSupabase()

export async function rpcCreateFamily(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_family', { p_name: name })
  if (error) throw new Error(error.message)
  return data as string
}

export async function rpcJoinFamily(code: string, role: Role = 'TEEN'): Promise<string> {
  const { data, error } = await supabase.rpc('join_family_by_code', { p_code: code, p_role: role })
  if (error) throw new Error(error.message)
  return data as string
}

export async function fetchFamily(familyId: string) {
  const { data, error } = await supabase
    .from('families')
    .select('id, name, code, avatar_url, created_at')
    .eq('id', familyId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchMember(familyId: string, profileId: string): Promise<Member> {
  const { data, error } = await supabase
    .from('family_members')
    .select(MEMBER_WITH_PROFILE_SELECT)
    .eq('family_id', familyId)
    .eq('profile_id', profileId)
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as Member
}

export async function fetchMemberById(id: string): Promise<Member> {
  const { data, error } = await supabase
    .from('family_members')
    .select(MEMBER_WITH_PROFILE_SELECT)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as Member
}

export async function fetchFamilyMembers(familyId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select(`
      id, role, nickname, profile_id, joined_at, points,
      color:color_palette(name, hex),
      profile:profiles(id, first_name, last_name, gender, avatar_url, birth_date)
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  const members = (data ?? []) as unknown as Member[]

  const roleOrder: Role[] = ['DAD', 'MOM', 'ADULT', 'TEEN', 'CHILD']
  members.sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  )

  return members
}

export async function updateFamilyAvatar(
  familyId: string,
  fileUri: string,
): Promise<{ id: string; avatar_url: string | null }> {
  const ext = fileUri.split('.').pop() || 'jpg'
  const path = `${familyId}/avatar-${Date.now()}.${ext}`

  const res = await fetch(fileUri)
  const blob = await res.blob()

  const { error: uploadError } = await supabase.storage
    .from('family-avatars')
    .upload(path, blob, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('families')
    .update({ avatar_url: path })
    .eq('id', familyId)
    .select('id, avatar_url')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function awardMemberPoints(memberId: string, delta: number) {
  const { data, error } = await supabase.rpc('award_member_points', {
    p_member_id: memberId,
    p_delta: delta,
  });
  if (error) throw new Error(error.message);
  return data?.[0];
}

export async function rotateFamilyCode(familyId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rotate_family_code', {
    p_family_id: familyId,
  })

  if (error) throw new Error(error.message)
  return data as string
}

export async function removeFamilyMember(
  familyId: string,
  memberId: string,
): Promise<boolean> {
  const { error } = await supabase.rpc('remove_family_member', {
    p_family_id: familyId,
    p_member_id: memberId,
  })
  if (error) throw new Error(error.message)
  return true
}

export async function updateMemberRole(
  memberId: string,
  role: Role,
): Promise<Pick<Member, 'id' | 'role'>> {
  const { data, error } = await supabase
    .from('family_members')
    .update({ role })
    .eq('id', memberId)
    .select('id, role')
    .single()

  if (error) throw new Error(error.message)
  return data as Pick<Member, 'id' | 'role'>
}
