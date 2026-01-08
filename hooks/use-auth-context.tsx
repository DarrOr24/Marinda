// hooks/use-auth-context.tsx
import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

import type { IdentifierInfo } from '@/lib/auth/auth.service'
import { Membership } from '@/lib/families/families.types'
import { FamilyMember } from '@/lib/members/members.types'
import { Profile } from '@/lib/profiles/profiles.types'


export type AuthData = {
  session: Session | null
  isEmailVerified: boolean
  email: string | null
  profileId: string | null
  profile: Profile | null
  member: FamilyMember | null
  memberships: Membership[] | null
  refreshMemberships: () => Promise<void>
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
  email: null,
  isEmailVerified: false,
  profileId: null,
  profile: null,
  member: null,
  memberships: null,
  refreshMemberships: async () => { },
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
