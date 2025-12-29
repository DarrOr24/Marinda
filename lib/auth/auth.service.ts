// lib/auth/auth.service.ts
import { getSupabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'


const supabase = getSupabase()

export type IdentifierType = 'phone' | 'email'

export interface IdentifierInfo {
  type: IdentifierType
  value: string
}

/** Decide if input is email or phone */
export function parseIdentifier(input: string): IdentifierInfo {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Please enter phone or email')

  if (trimmed.includes('@')) {
    return { type: 'email', value: trimmed.toLowerCase() }
  }

  if (!/^\+\d{8,15}$/.test(trimmed)) {
    throw new Error('Please enter a valid phone number (include country code)')
  }

  return { type: 'phone', value: trimmed }
}

/**
 * Request an OTP for a given identifier.
 * - phone: allow create-or-login (signup allowed)
 * - email: login-only (no signup by email)
 */
export async function requestOtp(
  identifier: IdentifierInfo,
): Promise<{
  ok: boolean
  error?: string
  canCreateWithPhoneInstead?: boolean
}> {
  if (identifier.type === 'phone') {
    const { error } = await supabase.auth.signInWithOtp({
      phone: identifier.value,
      options: {
        channel: 'sms',
        shouldCreateUser: true,
      },
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  }

  // EMAIL: login-only. If user doesn't exist, Supabase will error.
  const { error } = await supabase.auth.signInWithOtp({
    email: identifier.value,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    // Most likely: no user with this email.
    return {
      ok: false,
      error: error.message,
      canCreateWithPhoneInstead: true,
    }
  }

  return { ok: true }
}

/**
 * Verify OTP code and return logged-in user (session is set globally).
 * `type` must match how we sent it:
 * - phone -> 'sms'
 * - email -> 'email'
 */
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

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, user: data.user }
}
