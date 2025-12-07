// lib/families/families.types.ts
export type Role = 'MOM' | 'DAD' | 'ADULT' | 'TEEN' | 'CHILD'

export type Gender = 'MALE' | 'FEMALE'

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  gender: Gender
  avatar_url: string | null
  birth_date: Date | null
}

export interface Color {
  name: string
  hex: string
}

export interface Member {
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

export interface MyFamily {
  id: string
  name: string
  avatar_url: string | null
  role: Role
}
