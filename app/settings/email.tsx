// app/settings/email.tsx
import { useMemo, useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { EditEmailModal } from '@/components/settings/edit-email-modal'
import { Button } from '@/components/ui/button'
import { EditButton } from '@/components/ui/edit-button'
import { Screen } from '@/components/ui/screen'
import { useAuthContext } from '@/hooks/use-auth-context'
import { resendEmailChangeVerification, updateEmail } from '@/lib/auth/auth.service'

function isValidEmail(s: string) {
  return /^\S+@\S+\.\S+$/.test(s.trim())
}

export default function EmailSettingsScreen() {
  const { email, isEmailVerified } = useAuthContext()

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)

  const normalizedCurrent = useMemo(
    () => (email ?? '').trim().toLowerCase(),
    [email],
  )

  const displayEmail = normalizedCurrent ? normalizedCurrent : 'Not set'

  const canResend =
    isValidEmail(normalizedCurrent) && !isEmailVerified && !!email && !saving && !resending

  async function onSaveEmail(nextEmail: string) {
    try {
      setSaving(true)
      const res = await updateEmail(nextEmail)
      if (!res.ok) {
        Alert.alert('Email update failed', res.error ?? 'Please try again.')
        return
      }

      setEditOpen(false)
      Alert.alert(
        'Verify your email',
        'We sent a verification link. Open it on this device to complete verification.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function onResend() {
    if (!email) return
    try {
      setResending(true)
      const res = await resendEmailChangeVerification(email)
      if (!res.ok) {
        Alert.alert('Failed to resend', res.error ?? 'Please try again.')
        return
      }
      Alert.alert('Sent', 'We resent the verification email.')
    } finally {
      setResending(false)
    }
  }

  const statusLabel = isEmailVerified ? 'Verified' : 'Not verified'

  return (
    <Screen gap="sm">
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>✉️</Text>
      </View>

      <Text style={styles.description}>
        Email helps you access your account as a backup to your phone number.
      </Text>

      <Text style={[styles.label, { marginTop: 18 }]}>Email</Text>

      <View style={styles.emailRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.emailText} numberOfLines={1}>
            {displayEmail}
          </Text>
        </View>

        <EditButton size="md" onPress={() => setEditOpen(true)} />
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            isEmailVerified ? styles.dotVerified : styles.dotUnverified,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            isEmailVerified ? styles.textVerified : styles.textUnverified,
          ]}
        >
          {statusLabel}
        </Text>
      </View>

      {!isEmailVerified && !!email && (
        <Text style={styles.helper}>
          Tap the link in your email to verify this address.
        </Text>
      )}

      {!isEmailVerified && !!email && (
        <View style={{ marginTop: 12 }}>
          <Button
            title={resending ? 'Sending…' : 'Resend verification'}
            type="secondary"
            size="lg"
            onPress={onResend}
            disabled={!canResend}
            fullWidth
          />
        </View>
      )}

      <EditEmailModal
        visible={editOpen}
        initialEmail={email ?? ''}
        loading={saving}
        onClose={() => setEditOpen(false)}
        onSave={onSaveEmail}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: { fontSize: 72 },

  description: {
    marginTop: 14,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    paddingHorizontal: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  emailText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },

  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusDot: { width: 10, height: 10, borderRadius: 999 },
  dotVerified: { backgroundColor: '#16a34a' },
  dotUnverified: { backgroundColor: '#f59e0b' },

  statusText: { fontSize: 13, fontWeight: '700' },
  textVerified: { color: '#16a34a' },
  textUnverified: { color: '#f59e0b' },

  helper: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
})
