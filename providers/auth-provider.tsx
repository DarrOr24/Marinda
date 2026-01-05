// providers/auth-provider.tsx
import type { Session } from '@supabase/supabase-js'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Platform } from 'react-native'

import { AuthContext } from '@/hooks/use-auth-context'
import { appStorage } from '@/lib/app-storage'
import { type IdentifierInfo, requestOtp, verifyOtp } from '@/lib/auth/auth.service'
import { fetchMember } from '@/lib/families/families.api'
import { Member, Membership } from '@/lib/families/families.types'
import { getSupabase } from '@/lib/supabase'

const ACTIVE_FAMILY_KEY = 'marinda:activeFamilyId'

export default function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabase()

  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [memberships, setMemberships] = useState<Membership[] | null>(null)

  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isMembershipsLoading, setIsMembershipsLoading] = useState(false)
  const [isMemberLoading, setIsMemberLoading] = useState(false)
  const [isResolvingFamily, setIsResolvingFamily] = useState(false)

  const isLoading = isSessionLoading || isMembershipsLoading || isMemberLoading || isResolvingFamily

  const userId = session?.user?.id

  const [activeFamilyId, _setActiveFamilyId] = useState<string | null>(null)
  const setActiveFamilyId = useCallback(async (id: string | null) => {
    _setActiveFamilyId(id)
    if (id) await appStorage.setItem(ACTIVE_FAMILY_KEY, id)
    else await appStorage.removeItem(ACTIVE_FAMILY_KEY)
  }, [])

  const [pendingIdentifier, setPendingIdentifier] = useState<IdentifierInfo | null>(null)

  const cleanState = useCallback(async () => {
    setMemberships(null)
    setMember(null)
    setPendingIdentifier(null)
    await setActiveFamilyId(null)
  }, [setActiveFamilyId])

  const fetchMemberships = useCallback(async () => {
    if (!userId) {
      await cleanState()
      return
    }

    setIsMembershipsLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`family_id, family:families(id, name, code)`)
        .eq('profile_id', userId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      setMemberships(
        (data ?? []).map((m: any) => ({
          familyId: m.family.id,
          familyName: m.family.name,
          familyCode: m.family.code,
        })),
      )
    } catch (e) {
      console.error('Error fetching memberships:', e)
      setMemberships([])
    } finally {
      setIsMembershipsLoading(false)
    }
  }, [userId, supabase])

  // Fetch session once and subscribe to auth state changes
  useEffect(() => {
    const init = async () => {
      setIsSessionLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) console.error('Error fetching session:', error)
        setSession(data.session ?? null)
        if (!data.session) await cleanState()
      } finally {
        setIsSessionLoading(false)
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) void cleanState()
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // Native deep linking support (for OAuth / magic link)
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
    fetchMemberships()
  }, [userId, fetchMemberships])

  // Restore or auto-pick active family on login
  useEffect(() => {
    const restoreActiveFamily = async () => {
      if (!userId) {
        _setActiveFamilyId(null)
        await appStorage.removeItem(ACTIVE_FAMILY_KEY)
        return
      }
      if (!memberships) return

      setIsResolvingFamily(true)
      try {
        if (memberships.length === 0) {
          _setActiveFamilyId(null)
          return
        }

        const stored = await appStorage.getItem(ACTIVE_FAMILY_KEY)
        const isStillMember = stored ? memberships.some(m => m.familyId === stored) : false

        if (stored && isStillMember) {
          _setActiveFamilyId(stored)
          return
        }

        if (memberships.length === 1) {
          await setActiveFamilyId(memberships[0].familyId)
          return
        }

        _setActiveFamilyId(null)
      } finally {
        setIsResolvingFamily(false)
      }
    }

    restoreActiveFamily()
  }, [userId, memberships, setActiveFamilyId])

  // Fetch the member when the session or active family changes
  useEffect(() => {
    const fetchCurrMember = async () => {
      if (!userId || !activeFamilyId) {
        setMember(null)
        return
      }

      setIsMemberLoading(true)
      try {
        const m = await fetchMember(activeFamilyId, userId)
        setMember(m)
      } catch (e) {
        console.error('Error fetching member:', e)
        setMember(null)
      } finally {
        setIsMemberLoading(false)
      }
    }

    fetchCurrMember()
  }, [userId, activeFamilyId])

  const startAuth = useCallback(async (identifier: IdentifierInfo) => {
    const res = await requestOtp(identifier)
    if (!res.ok) {
      return { ok: false, error: res.error ?? 'Could not start login. Please try again.' }
    }

    setPendingIdentifier(identifier)
    return { ok: true, error: undefined }
  }, [])

  const confirmOtp = useCallback(async (code: string) => {
    if (!pendingIdentifier) return { ok: false, error: 'No login in progress' }

    const res = await verifyOtp(pendingIdentifier, code)
    if (!res.ok) return { ok: false, error: res.error ?? 'Invalid code' }

    setPendingIdentifier(null)
    return { ok: true, error: undefined }
  }, [pendingIdentifier])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await cleanState()
  }, [supabase, setActiveFamilyId])

  const value = useMemo(
    () => ({
      session,
      profileId: userId ?? null,
      member,
      memberships,
      refreshMemberships: fetchMemberships,
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
      fetchMemberships,
      isLoading,
      pendingIdentifier,
      startAuth,
      confirmOtp,
      signOut,
      activeFamilyId,
      setActiveFamilyId,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
