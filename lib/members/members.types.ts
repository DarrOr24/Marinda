// lib/members/members.types.ts
import { type Profile } from "@/lib/profiles/profiles.types";


export type Role = 'MOM' | 'DAD' | 'ADULT' | 'TEEN' | 'CHILD'

export type RoleOption = {
  label: string
  labelKey: string
  value: Role
}

export const ROLE_OPTIONS: RoleOption[] = [
  { label: 'Mom', labelKey: 'settings.common.roles.MOM', value: 'MOM' },
  { label: 'Dad', labelKey: 'settings.common.roles.DAD', value: 'DAD' },
  { label: 'Adult', labelKey: 'settings.common.roles.ADULT', value: 'ADULT' },
  { label: 'Teen', labelKey: 'settings.common.roles.TEEN', value: 'TEEN' },
  { label: 'Child', labelKey: 'settings.common.roles.CHILD', value: 'CHILD' },
]

export const KID_ROLE_OPTIONS = ROLE_OPTIONS.filter((option) =>
  option.value === 'TEEN' || option.value === 'CHILD'
)
export interface Color {
  name: string
  hex: string
}

export interface FamilyMember {
  id: string
  family_id?: string
  profile_id: string
  role: Role
  nickname: string | null
  avatar_url: string | null
  joined_at: string | null
  profile: Profile | null
  color: Color | null
  points: number
  kid_mode_pin?: string | null
  // client-only: injected into React Query cache
  avatarCacheBuster?: number
  public_avatar_url?: string | null
}

export type UpdateMemberInput = Partial<
  Omit<FamilyMember, 'color' | 'profile' | 'public_avatar_url' | 'avatarCacheBuster'>
> & {
  color_scheme?: string | null
}
