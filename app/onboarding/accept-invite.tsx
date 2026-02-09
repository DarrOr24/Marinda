// app/onboarding/accept-invite.tsx
// Explicit accept / reject UI for a pending family invite after login.

import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useAuthContext } from '@/hooks/use-auth-context'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui'

export default function AcceptInviteScreen() {
  const {
    pendingInviteToken,
    setPendingInviteToken,
    refreshMemberships,
    setActiveFamilyId,
  } = useAuthContext()

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  console.log('pendingInviteToken', pendingInviteToken)

  async function onAccept() {
    if (!pendingInviteToken || loading) return
    setLoading(true)
    setErrorMsg(null)
    try {

      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('accept_family_invite', {
        invite_token: pendingInviteToken,
      })
      if (error) throw error

      // Clear token so we don't re-prompt
      await setPendingInviteToken(null)

      const familyId = (data as { family_id?: string }[] | null)?.[0]?.family_id
      if (familyId) {
        await setActiveFamilyId(familyId)
      }

      await refreshMemberships()

      // Let AuthRouter route them into the correct home/profile
      router.replace('/')
    } catch (e: any) {
      console.error('Accept invite failed', e)
      setErrorMsg(e?.message ?? 'Could not accept invite. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function onReject() {
    if (!pendingInviteToken || loading) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const supabase = getSupabase()

      const { error } = await supabase.rpc('reject_family_invite', {
        invite_token: pendingInviteToken,
      })
      if (error) throw error

      await setPendingInviteToken(null)
      await refreshMemberships()

      // After rejecting, hand control back to AuthRouter (normal flow)
      router.replace('/')
    } catch (e: any) {
      console.error('Reject invite failed', e)
      setErrorMsg(e?.message ?? 'Could not reject invite. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!pendingInviteToken) {
    // Short-lived while state settles / AuthRouter redirects
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
        You’ve been invited to join a family.
      </Text>
      <Text style={{ fontSize: 14, textAlign: 'center', color: '#64748b' }}>
        Accept to join this family and see its members and boards. You can also reject the invite.
      </Text>

      {errorMsg && (
        <Text style={{ fontSize: 13, color: '#b91c1c', textAlign: 'center' }}>{errorMsg}</Text>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <Button
          title={loading ? 'Joining…' : 'Join family'}
          type="primary"
          size="lg"
          onPress={onAccept}
          disabled={loading}
          fullWidth={false}
        />
        <Button
          title="Reject"
          type="ghost"
          size="lg"
          onPress={onReject}
          disabled={loading}
        />
      </View>
    </View>
  )
}