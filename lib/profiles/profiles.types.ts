export type Gender = 'MALE' | 'FEMALE'

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
]

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  gender: Gender
  avatar_url: string | null
  birth_date: string // "YYYY-MM-DD" or ""
}