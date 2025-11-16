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
    .select('id, name, code, created_at')
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
      id, role, nickname, profile_id, joined_at,
      color:color_palette(name, hex),
      profile:profiles(id, first_name, last_name, gender, avatar_url, birth_date)
    `)
    .eq('family_id', familyId)

  if (error) throw new Error(error.message)

  const members = (data ?? []) as unknown as Member[]

  const roleOrder: Role[] = ['DAD', 'MOM', 'ADULT', 'TEEN', 'CHILD']
  members.sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  )

  return members
}
