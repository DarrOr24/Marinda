// hooks/use-auth-context.tsx
import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

import type { IdentifierInfo } from '@/lib/auth/auth.service'
import { Member } from '@/lib/families/families.types'


export type Membership = {
  familyId: string
  familyName: string
  familyCode: string
}

export type AuthData = {
  session: Session | null
  profileId: string | null
  member: Member | null
  memberships: Membership[] | null
  isLoading: boolean
  isLoggedIn: boolean
  pendingIdentifier: IdentifierInfo | null
  startAuth: (identifier: IdentifierInfo) => Promise<{ ok: boolean; error?: string }>
  confirmOtp: (code: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
  activeFamilyId: string | null
  setActiveFamilyId: (id: string | null) => Promise<void>
}

export const AuthContext = createContext<AuthData>({
  session: null,
  profileId: null,
  member: null,
  memberships: null,
  isLoading: true,
  isLoggedIn: false,
  pendingIdentifier: null,
  startAuth: async () => ({ ok: false, error: 'Not implemented' }),
  confirmOtp: async () => ({ ok: false, error: 'Not implemented' }),
  signOut: async () => { },
  activeFamilyId: null,
  setActiveFamilyId: async () => { },
})

export const useAuthContext = () => useContext(AuthContext)
