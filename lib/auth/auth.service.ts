// lib/auth/auth.service.ts
import { getSupabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'


const supabase = getSupabase()

export type IdentifierType = 'phone' | 'email'
export interface IdentifierInfo {
  type: IdentifierType
  value: string
}

export async function requestOtp(
  identifier: IdentifierInfo,
): Promise<{ ok: boolean; error?: string }> {
  if (identifier.type === 'phone') {
    const { error } = await supabase.auth.signInWithOtp({
      phone: identifier.value,
      options: {
        channel: 'sms',
        shouldCreateUser: true, // signup allowed
      },
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: identifier.value,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    return { ok: false, error: 'Could not sign in with email. Try phone or check the email address.' }
  }

  return { ok: true }
}

export async function verifyOtp(
  identifier: IdentifierInfo,
  token: string,
): Promise<{ ok: boolean; error?: string; user?: User | null }> {
  const code = token.trim()
  if (!code) return { ok: false, error: 'Missing code' }

  const payload =
    identifier.type === 'phone'
      ? { phone: identifier.value, token: code, type: 'sms' as const }
      : { email: identifier.value, token: code, type: 'email' as const }

  const { data, error } = await supabase.auth.verifyOtp(payload)
  if (error) return { ok: false, error: error.message }

  return { ok: true, user: data.user }
}
