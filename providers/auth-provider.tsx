// providers/auth-provider.tsx
import type { Session } from '@supabase/supabase-js'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Platform,
} from 'react-native'

import { AuthContext } from '@/hooks/use-auth-context'
import {
  configureRevenueCat,
  identifyRevenueCatUser,
  logoutRevenueCat,
} from '@/lib/billing'
import { appStorage } from '@/lib/app-storage'
import { type IdentifierInfo, requestOtp, verifyOtp } from '@/lib/auth/auth.service'
import { Membership } from '@/lib/families/families.types'
import { useFamilyProfileMember, useMember } from '@/lib/members/members.hooks'
import {
  ensureProfileForAuthUser,
  fetchProfileByAuthUserId,
} from '@/lib/profiles/profiles.api'
import { Profile } from '@/lib/profiles/profiles.types'
import { getSupabase } from '@/lib/supabase'
import { KID_MODE_PIN_PATTERN, isParentRole } from '@/utils/validation.utils'


export const ACTIVE_FAMILY_KEY = 'marinda:activeFamilyId'
export const PENDING_INVITE_KEY = 'marinda:pendingInviteToken'
export const KID_MODE_MEMBER_BY_FAMILY_KEY = 'marinda:kidModeMemberByFamily'

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabase()

  const [session, setSession] = useState<Session | null>(null)
  const [actingMemberId, setActingMemberId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<Membership[] | null>(null)

  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isMembershipsLoading, setIsMembershipsLoading] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isResolvingFamily, setIsResolvingFamily] = useState(false)

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

  const authUserId = session?.user?.id
  const authMemberQuery = useFamilyProfileMember(activeFamilyId, profile?.id ?? null)
  const actingMemberQuery = useMember(actingMemberId)

  const authMember = authMemberQuery.data ?? null
  const actingMember = actingMemberQuery.data ?? null
  const email = session?.user?.email ?? null
  const isEmailVerified = !!session?.user?.email_confirmed_at
  const isKidMode = !!actingMember && !!authMember && actingMember.id !== authMember.id
  const effectiveMember = isKidMode ? actingMember : authMember
  const hasParentPermissions = isParentRole(effectiveMember?.role)
  const isLoading =
    isSessionLoading
    || isMembershipsLoading
    || authMemberQuery.isLoading
    || actingMemberQuery.isLoading
    || isProfileLoading
    || isResolvingFamily


  const readKidModeMemberMap = useCallback(async () => {
    const raw = await appStorage.getItem(KID_MODE_MEMBER_BY_FAMILY_KEY)
    if (!raw) return {} as Record<string, string>

    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      return parsed ?? {}
    } catch {
      return {}
    }
  }, [])

  const setKidModeMemberForFamily = useCallback(async (familyId: string, memberId: string | null) => {
    const current = await readKidModeMemberMap()

    if (memberId) current[familyId] = memberId
    else delete current[familyId]

    if (Object.keys(current).length === 0) {
      await appStorage.removeItem(KID_MODE_MEMBER_BY_FAMILY_KEY)
      return
    }

    await appStorage.setItem(KID_MODE_MEMBER_BY_FAMILY_KEY, JSON.stringify(current))
  }, [readKidModeMemberMap])

  const clearAllKidModeMembers = useCallback(async () => {
    await appStorage.removeItem(KID_MODE_MEMBER_BY_FAMILY_KEY)
  }, [])

  const cleanState = useCallback(async () => {
    setMemberships(null)
    setActingMemberId(null)
    setProfile(null)
    setPendingIdentifier(null)
    await setActiveFamilyId(null)
    await setPendingInviteToken(null)
    await clearAllKidModeMembers()
  }, [clearAllKidModeMembers, setActiveFamilyId, setPendingInviteToken])

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

  // Configure RevenueCat on mount; identify when user logs in
  useEffect(() => {
    configureRevenueCat()
  }, [])

  useEffect(() => {
    if (authUserId) {
      identifyRevenueCatUser(authUserId).catch(() => { })
    }
  }, [authUserId])

  // Fetch session once and subscribe to auth state changes
  useEffect(() => {
    const init = async () => {
      setIsSessionLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) console.error('Error fetching session:', error)
        if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token)
        setSession(data.session ?? null)
        if (!data.session) await cleanState()
      } finally {
        setIsSessionLoading(false)
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.access_token) supabase.realtime.setAuth(s.access_token)
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
        // Profile may be missing if handle_new_user trigger failed (e.g. phone signup)
        try {
          const p = await ensureProfileForAuthUser(authUserId)
          setProfile(p)
        } catch (fallbackErr) {
          console.error('Error fetching/creating profile:', e, fallbackErr)
          setProfile(null)
        }
      } finally {
        setIsProfileLoading(false)
      }
    }

    fetchCurrProfile()
  }, [authUserId])

  useEffect(() => {
    const restoreKidModeForFamily = async () => {
      if (!activeFamilyId || !authMember) {
        setActingMemberId(null)
        return
      }

      if (authMember.family_id !== activeFamilyId) {
        setActingMemberId(null)
        return
      }

      if (!isParentRole(authMember.role)) {
        await setKidModeMemberForFamily(activeFamilyId, null)
        setActingMemberId(null)
        return
      }

      const current = await readKidModeMemberMap()
      const storedMemberId = current[activeFamilyId] ?? null
      setActingMemberId(storedMemberId)
    }

    restoreKidModeForFamily()
  }, [activeFamilyId, authMember, readKidModeMemberMap, setKidModeMemberForFamily])

  useEffect(() => {
    const validateActingMember = async () => {
      if (!actingMemberId || !activeFamilyId || actingMemberQuery.isLoading) return

      const member = actingMemberQuery.data
      if (
        !member
        || member.family_id !== activeFamilyId
        || (member.role !== 'CHILD' && member.role !== 'TEEN')
      ) {
        if (actingMemberQuery.error) {
          console.error('Error fetching acting member:', actingMemberQuery.error)
        }
        await setKidModeMemberForFamily(activeFamilyId, null)
        setActingMemberId(null)
      }
    }

    void validateActingMember()
  }, [
    actingMemberId,
    activeFamilyId,
    actingMemberQuery.data,
    actingMemberQuery.error,
    actingMemberQuery.isLoading,
    setKidModeMemberForFamily,
  ])

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

  const enterKidMode = useCallback(async (memberId: string) => {
    if (!activeFamilyId || !authMember || !isParentRole(authMember.role)) {
      return false
    }

    try {
      if (!authMember.kid_mode_pin) {
        Alert.alert(
          'Kid mode PIN required',
          'Set up a kid mode PIN in Settings before entering kid mode.',
        )
        return false
      }

      await setKidModeMemberForFamily(activeFamilyId, memberId)
      setActingMemberId(memberId)
      return true
    } catch (error) {
      console.error('Error entering kid mode:', error)
      Alert.alert('Could not enter kid mode', 'Please try again.')
      return false
    }
  }, [activeFamilyId, authMember, setKidModeMemberForFamily])

  const exitKidMode = useCallback(async (pin?: string | null) => {
    if (!activeFamilyId || !isKidMode || !authMember) return true

    try {
      if (authMember.kid_mode_pin) {
        if (!pin) return false
        if (!KID_MODE_PIN_PATTERN.test(pin)) {
          Alert.alert('Choose a 4-digit PIN', 'Please enter exactly 4 digits.')
          return false
        }
        if (pin !== authMember.kid_mode_pin) {
          Alert.alert('Incorrect PIN', 'The PIN you entered is not correct.')
          return false
        }
      }

      await setKidModeMemberForFamily(activeFamilyId, null)
      setActingMemberId(null)
      return true
    } catch (error) {
      console.error('Error exiting kid mode:', error)
      Alert.alert('Could not exit kid mode', 'Please try again.')
      return false
    }
  }, [activeFamilyId, authMember, isKidMode, setKidModeMemberForFamily])

  const signOut = useCallback(async () => {
    await logoutRevenueCat().catch(() => { })
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
      authMember,
      effectiveMember,
      isKidMode,
      hasParentPermissions,
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
      enterKidMode,
      exitKidMode,
      pendingInviteToken,
      setPendingInviteToken,
    }),
    [
      session,
      authUserId,
      email,
      isEmailVerified,
      profile,
      authMember,
      effectiveMember,
      isKidMode,
      hasParentPermissions,
      memberships,
      fetchMemberships,
      isLoading,
      pendingIdentifier,
      startAuth,
      confirmOtp,
      signOut,
      activeFamilyId,
      setActiveFamilyId,
      enterKidMode,
      exitKidMode,
      pendingInviteToken,
      setPendingInviteToken,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
