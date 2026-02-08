// lib/members/members.types.ts
import { type Profile } from "@/lib/profiles/profiles.types";


export type Role = 'MOM' | 'DAD' | 'ADULT' | 'TEEN' | 'CHILD'

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Mom', value: 'MOM' },
  { label: 'Dad', value: 'DAD' },
  { label: 'Adult', value: 'ADULT' },
  { label: 'Teen', value: 'TEEN' },
  { label: 'Child', value: 'CHILD' },
]
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
  // client-only: injected into React Query cache
  avatarCacheBuster?: number
  public_avatar_url?: string | null
}
