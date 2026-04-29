export type Gender = 'MALE' | 'FEMALE'

export type GenderOption = {
  label: string
  labelKey: string
  value: Gender
}

export const GENDER_OPTIONS: GenderOption[] = [
  { label: 'Male', labelKey: 'settings.common.genders.MALE', value: 'MALE' },
  { label: 'Female', labelKey: 'settings.common.genders.FEMALE', value: 'FEMALE' },
]

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  gender: Gender
  avatar_url: string | null
  birth_date: string // "YYYY-MM-DD" or ""
}