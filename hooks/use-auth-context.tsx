import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthData = {
  session: Session | null
  profile: any | null
  isLoading: boolean
  isLoggedIn: boolean
  signInWithEmailPassword: (email: string, password: string) => Promise<Session | null>
  signOut: () => Promise<void>
  activeFamilyId: string | null
  setActiveFamilyId: (id: string | null) => Promise<void>
}

export const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  isLoading: true,
  isLoggedIn: false,
  signInWithEmailPassword: async () => null,
  signOut: async () => { },
  activeFamilyId: null,
  setActiveFamilyId: async () => { },
})

export const useAuthContext = () => useContext(AuthContext)