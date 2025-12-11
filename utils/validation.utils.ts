// utils/validation.utils.ts
import type { Role } from '@/lib/families/families.types'


export function isParentRole(role?: Role | null): boolean {
  return role === 'MOM' || role === 'DAD'
}

export function isKidRole(role?: Role | null): boolean {
  return role === 'CHILD' || role === 'TEEN' || role === 'ADULT'
}
