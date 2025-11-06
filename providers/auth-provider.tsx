import type { Session } from '@supabase/supabase-js'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Platform } from 'react-native'

import { AuthContext } from '@/hooks/use-auth-context'
import { appStorage } from '@/lib/app-storage'
import { getSupabase } from '@/lib/supabase'


const ACTIVE_FAMILY_KEY = 'marinda:activeFamilyId'

export default function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabase()

  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [activeFamilyId, _setActiveFamilyId] = useState<string | null>(null)
  const setActiveFamilyId = useCallback(async (id: string | null) => {
    _setActiveFamilyId(id)
    try {
      if (id) await appStorage.setItem(ACTIVE_FAMILY_KEY, id)
      else await appStorage.removeItem(ACTIVE_FAMILY_KEY)
    } catch { }
  }, [])

  // Fetch the session once, and subscribe to auth state changes
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true)

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error fetching session:', error)
      }

      setSession(session)
      setIsLoading(false)
    }

    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', { event: _event, session })
      setSession(session)
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Native deep linking support
  useEffect(() => {
    if (Platform.OS === 'web') return

    const handleUrl = async (url: string | null) => {
      if (!url) return
      const { data, error } = await supabase.auth.exchangeCodeForSession(url)
      if (error) {
      } else if (data?.session) {
        setSession(data.session)
      }
    }

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    Linking.getInitialURL().then(handleUrl)
    return () => sub.remove()
  }, [supabase])

  // Fetch the profile when the session changes
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)

      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProfile(data)
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    }

    fetchProfile()
  }, [session, supabase])

  // Restore or auto-pick active family on login
  useEffect(() => {
    const fetchActiveFamilyId = async () => {
      if (!session?.user) {
        _setActiveFamilyId(null)
        await appStorage.removeItem(ACTIVE_FAMILY_KEY)
        return
      }

      const stored = await appStorage.getItem(ACTIVE_FAMILY_KEY)
      if (stored) {
        _setActiveFamilyId(stored)
        return
      }

      const { data, error } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('profile_id', session.user.id)
        .order('joined_at', { ascending: true })
        .limit(1)

      if (error) {
        console.error('Error fetching active family:', error)
        return
      }

      const first = data?.[0]?.family_id ?? null
      if (first) setActiveFamilyId(first)
    }

    fetchActiveFamilyId()
  }, [session, supabase])

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Error logging in:', error)
        throw error
      }

      setSession(data.session ?? null)
      return data.session
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    setSession(null)
    setActiveFamilyId(null)
  }, [supabase])

  const value = useMemo(
    () => ({
      session,
      profile,
      isLoading,
      isLoggedIn: !!session,
      signInWithEmailPassword,
      signOut,
      activeFamilyId,
      setActiveFamilyId,
    }),
    [session, profile, isLoading, activeFamilyId, signInWithEmailPassword, signOut, setActiveFamilyId]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}