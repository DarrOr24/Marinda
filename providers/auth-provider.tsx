// providers/auth-provider.tsx
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'expo-router'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Platform } from 'react-native'

import { AuthContext, Membership } from '@/hooks/use-auth-context'
import { appStorage } from '@/lib/app-storage'
import { IdentifierInfo, parseIdentifier, requestOtp, verifyOtp } from '@/lib/auth/auth.service'
import { fetchMember } from '@/lib/families/families.api'
import { Member } from '@/lib/families/families.types'
import { getSupabase } from '@/lib/supabase'

const ACTIVE_FAMILY_KEY = 'marinda:activeFamilyId'

export default function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabase()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [memberships, setMemberships] = useState<Membership[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [activeFamilyId, _setActiveFamilyId] = useState<string | null>(null)
  const setActiveFamilyId = useCallback(async (id: string | null) => {
    _setActiveFamilyId(id)
    try {
      if (id) await appStorage.setItem(ACTIVE_FAMILY_KEY, id)
      else await appStorage.removeItem(ACTIVE_FAMILY_KEY)
    } catch { }
  }, [])

  // NEW: identifier currently in OTP flow
  const [pendingIdentifier, setPendingIdentifier] = useState<IdentifierInfo | null>(null)

  // Fetch session once and subscribe to auth state changes
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Error fetching session:', error)
      setSession(data.session ?? null)
      setIsLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // Native deep linking support (for OAuth / magic link; can stay for future Google login)
  useEffect(() => {
    if (Platform.OS === 'web') return
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes('auth-callback')) return
      const { data, error } = await supabase.auth.exchangeCodeForSession(url)
      if (error) console.error(error)
      else if (data?.session) setSession(data.session)
    }
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    Linking.getInitialURL().then(handleUrl)
    return () => sub.remove()
  }, [supabase])

  // fetch memberships whenever session changes
  useEffect(() => {
    const fetchMemberships = async () => {
      if (!session?.user) {
        setMemberships(null)
        return
      }
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          family_id,
          family:families( id, name, code )
        `)
        .eq('profile_id', session.user.id)
        .order('joined_at', { ascending: true })

      if (error) throw new Error(error.message)

      setMemberships(
        data.map((m: any) => ({
          familyId: m.family.id,
          familyName: m.family.name,
          familyCode: m.family.code,
        })) as unknown as Membership[],
      )
    }
    fetchMemberships()
  }, [session, supabase])

  // Fetch the member when the session or active family changes
  useEffect(() => {
    setIsLoading(true)

    const fetchCurrMember = async () => {
      if (session && activeFamilyId) {
        const member = await fetchMember(activeFamilyId, session.user.id)
        setMember(member)
      } else {
        setMember(null)
      }
      setIsLoading(false)
    }

    fetchCurrMember()
  }, [session, activeFamilyId, supabase])

  // Restore or auto-pick active family on login
  useEffect(() => {
    const restoreActiveFamilyOrRoute = async () => {
      if (!session?.user) {
        _setActiveFamilyId(null)
        await appStorage.removeItem(ACTIVE_FAMILY_KEY)
        return
      }

      if (!memberships) return

      // 1) No memberships found, route to onboarding
      if (memberships.length === 0) {
        _setActiveFamilyId(null)
        router.replace('/onboarding')
        return
      }

      // 2) Try to restore active family from storage
      const stored = await appStorage.getItem(ACTIVE_FAMILY_KEY)
      if (stored) {
        _setActiveFamilyId(stored)
        return
      }

      // 3) If there's only one membership, set it as active
      if (memberships.length === 1) {
        const only = memberships[0].familyId
        await setActiveFamilyId(only)
        return
      }

      _setActiveFamilyId(null)
      router.replace('/select-family')
    }

    restoreActiveFamilyOrRoute()
  }, [session, memberships, router])

  const startAuth = useCallback(
    async (rawIdentifier: string) => {
      const identifier = parseIdentifier(rawIdentifier)
      const res = await requestOtp(identifier)
      if (!res.ok) {
        return {
          ok: false,
          error: res.error ?? 'Could not start login. Please try again.',
          needsPhoneInstead: !!res.canCreateWithPhoneInstead,
        }
      }

      setPendingIdentifier(identifier)
      return { ok: true, error: undefined, needsPhoneInstead: false }
    },
    [],
  )

  const confirmOtp = useCallback(
    async (code: string) => {
      if (!pendingIdentifier) {
        return { ok: false, error: 'No login in progress' }
      }

      const res = await verifyOtp(pendingIdentifier, code)
      if (!res.ok) {
        return { ok: false, error: res.error ?? 'Invalid code' }
      }

      // Session is now valid; our auth listener will update `session`
      setPendingIdentifier(null)
      return { ok: true, error: undefined }
    },
    [pendingIdentifier],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    setSession(null)
    setActiveFamilyId(null)
  }, [supabase, setActiveFamilyId])

  const value = useMemo(
    () => ({
      session,
      member,
      memberships,
      isLoading,
      isLoggedIn: !!session,
      pendingIdentifier,
      startAuth,
      confirmOtp,
      signOut,
      activeFamilyId,
      setActiveFamilyId,
    }),
    [
      session,
      member,
      memberships,
      isLoading,
      pendingIdentifier,
      startAuth,
      confirmOtp,
      activeFamilyId,
      signOut,
      setActiveFamilyId,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
