// utils/validation.utils.ts
import type { Role } from '@/lib/members/members.types'


export const KID_MODE_PIN_PATTERN = /^\d{4}$/

export function isValidEmail(email?: string | null): boolean {
  return email != null && /^\S+@\S+\.\S+$/.test(email)
}

export function isParentRole(role?: Role | null): boolean {
  return role === 'MOM' || role === 'DAD'
}

export function isKidRole(role?: Role | null): boolean {
  return role === 'CHILD' || role === 'TEEN' || role === 'ADULT'
}
