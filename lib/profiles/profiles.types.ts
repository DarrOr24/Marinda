export type Gender = 'MALE' | 'FEMALE'

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  gender: Gender
  avatar_url: string | null
  birth_date: string // "YYYY-MM-DD" or ""
}