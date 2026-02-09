// providers/auth-provider.tsx
import type { Session } from '@supabase/supabase-js'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Platform } from 'react-native'

import { AuthContext } from '@/hooks/use-auth-context'
import { appStorage } from '@/lib/app-storage'
import { type IdentifierInfo, requestOtp, verifyOtp } from '@/lib/auth/auth.service'
import { fetchMember } from '@/lib/families/families.api'
import { Membership } from '@/lib/families/families.types'
import { FamilyMember } from '@/lib/members/members.types'
import { fetchProfileByAuthUserId } from '@/lib/profiles/profiles.api'
import { Profile } from '@/lib/profiles/profiles.types'
import { getSupabase } from '@/lib/supabase'


export const ACTIVE_FAMILY_KEY = 'marinda:activeFamilyId'
export const PENDING_INVITE_KEY = 'marinda:pendingInviteToken'

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabase()

  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<FamilyMember | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<Membership[] | null>(null)

  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isMembershipsLoading, setIsMembershipsLoading] = useState(false)
  const [isMemberLoading, setIsMemberLoading] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isResolvingFamily, setIsResolvingFamily] = useState(false)

  const isLoading = isSessionLoading || isMembershipsLoading || isMemberLoading || isProfileLoading || isResolvingFamily

  const authUserId = session?.user?.id

  const email = session?.user?.email ?? null
  const isEmailVerified = !!session?.user?.email_confirmed_at

  const [activeFamilyId, _setActiveFamilyId] = useState<string | null>(null)
  const setActiveFamilyId = useCallback(async (id: string | null) => {
    _setActiveFamilyId(id)
    if (id) await appStorage.setItem(ACTIVE_FAMILY_KEY, id)
    else await appStorage.removeItem(ACTIVE_FAMILY_KEY)
  }, [])

  const [pendingInviteToken, _setPendingInviteToken] = useState<string | null>(null)
  const setPendingInviteToken = useCallback(async (token: string | null) => {
    _setPendingInviteToken(token)
    if (token) await appStorage.setItem(PENDING_INVITE_KEY, token)
    else await appStorage.removeItem(PENDING_INVITE_KEY)
  }, [])

  const [pendingIdentifier, setPendingIdentifier] = useState<IdentifierInfo | null>(null)

  const cleanState = useCallback(async () => {
    setMemberships(null)
    setMember(null)
    setProfile(null)
    setPendingIdentifier(null)
    await setActiveFamilyId(null)
    await setPendingInviteToken(null)
  }, [setActiveFamilyId])

  const fetchMemberships = useCallback(async () => {
    if (!authUserId) {
      await cleanState()
      return
    }
    if (!profile?.id) return

    setIsMembershipsLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`family_id, family:families(id, name, code)`)
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) throw error

      setMemberships(
        (data ?? [])
          .filter((m: any) => m.family)
          .map((m: any) => ({
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
  }, [authUserId, profile?.id, supabase])

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

  // Native deep linking support (for OAuth code exchange or magic link with tokens in fragment)
  useEffect(() => {
    if (Platform.OS === 'web') return

    const handleUrl = async (url: string | null) => {
      if (!url) return
      if (!url.includes('auth-callback')) return

      // Magic link redirect: tokens in fragment (e.g. ...#access_token=...&refresh_token=...)
      const hashIdx = url.indexOf('#')
      if (hashIdx >= 0) {
        const params = new URLSearchParams(url.slice(hashIdx + 1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (!error && data?.session) setSession(data.session)
          return
        }
      }

      // OAuth / PKCE: code in URL
      const { data, error } = await supabase.auth.exchangeCodeForSession(url)
      if (error) {
        console.error('exchangeCodeForSession error:', error)
        return
      }
      if (data?.session) setSession(data.session)

      const refreshed = await supabase.auth.getSession()
      if (refreshed.data.session) setSession(refreshed.data.session)
    }

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    Linking.getInitialURL().then(handleUrl)
    return () => sub.remove()
  }, [supabase])

  // fetch memberships whenever session changes
  useEffect(() => {
    fetchMemberships()
  }, [profile?.id, fetchMemberships])

  // Restore or auto-pick active family on login
  useEffect(() => {
    const restoreActiveFamily = async () => {
      if (!authUserId) {
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
  }, [authUserId, memberships, setActiveFamilyId])

  // Restore pending invite token on app start
  useEffect(() => {
    const restorePendingInvite = async () => {
      const stored = await appStorage.getItem(PENDING_INVITE_KEY)
      _setPendingInviteToken(stored ?? null)
    }
    restorePendingInvite()
  }, [])

  // Fetch the profile when the session changes
  useEffect(() => {
    const fetchCurrProfile = async () => {
      if (!authUserId) {
        setProfile(null)
        return
      }

      setIsProfileLoading(true)
      try {
        const p = await fetchProfileByAuthUserId(authUserId)
        setProfile(p)
      } catch (e) {
        console.error('Error fetching profile:', e)
        setProfile(null)
      } finally {
        setIsProfileLoading(false)
      }
    }

    fetchCurrProfile()
  }, [authUserId])

  // Fetch the member when the session or active family changes
  useEffect(() => {
    const fetchCurrMember = async () => {
      if (!profile?.id || !activeFamilyId) {
        setMember(null)
        return
      }

      setIsMemberLoading(true)
      try {
        const m = await fetchMember(activeFamilyId, profile.id)
        setMember(m)
      } catch (e) {
        console.error('Error fetching member:', e)
        setMember(null)
      } finally {
        setIsMemberLoading(false)
      }
    }

    fetchCurrMember()
  }, [profile?.id, activeFamilyId])

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
  }, [supabase, cleanState])

  const value = useMemo(
    () => ({
      session,
      authUserId: authUserId ?? null,
      email,
      isEmailVerified,
      profileId: profile?.id ?? null,
      profile,
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
      pendingInviteToken,
      setPendingInviteToken,
    }),
    [
      session,
      authUserId,
      email,
      isEmailVerified,
      profile,
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
      pendingInviteToken,
      setPendingInviteToken,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
