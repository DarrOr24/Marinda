import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

import { Member } from '@/lib/families/families.types'
import { SignUpDetails } from '@/providers/signup-flow-provider'


export type Membership = {
  familyId: string
  familyName: string
  familyCode: string
}

export type AuthData = {
  session: Session | null
  member: Member | null
  memberships: Membership[] | null
  isLoading: boolean
  isLoggedIn: boolean
  signInWithEmailPassword: (email: string, password: string) => Promise<Session | null>
  signUpWithEmailPassword: (email: string, password: string, details: SignUpDetails) => Promise<Session | null>
  signOut: () => Promise<void>
  activeFamilyId: string | null
  setActiveFamilyId: (id: string | null) => Promise<void>
}

export const AuthContext = createContext<AuthData>({
  session: null,
  member: null,
  memberships: null,
  isLoading: true,
  isLoggedIn: false,
  signInWithEmailPassword: async () => null,
  signUpWithEmailPassword: async () => null,
  signOut: async () => { },
  activeFamilyId: null,
  setActiveFamilyId: async () => { },
})

export const useAuthContext = () => useContext(AuthContext)