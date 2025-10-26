import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthData = {
  session: Session | null | undefined
  profile?: any
  isLoading: boolean
  isLoggedIn: boolean
  signInWithEmailPassword?: (email: string, password: string) => Promise<Session | null | undefined>
  signOut?: () => Promise<void>
}

export const AuthContext = createContext<AuthData>({
  session: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  signInWithEmailPassword: undefined,
  signOut: undefined,
})

export const useAuthContext = () => useContext(AuthContext)