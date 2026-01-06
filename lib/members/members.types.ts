// lib/members/members.types.ts
import { type Profile } from "@/lib/profiles/profiles.types"


export type Role = 'MOM' | 'DAD' | 'ADULT' | 'TEEN' | 'CHILD'

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
  joined_at: string | null
  profile: Profile | null
  color: Color | null
  points: number
}

