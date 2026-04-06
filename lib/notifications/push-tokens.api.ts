import { getSupabase } from '@/lib/supabase'

import type { PushTokenRegistration, PushTokenRow } from './push-notifications.types'

const supabase = getSupabase()

export async function upsertPushTokens(registrations: PushTokenRegistration[]): Promise<PushTokenRow[]> {
  if (registrations.length === 0) return []

  const rows = registrations.map(registration => ({
    member_id: registration.memberId,
    expo_push_token: registration.expoPushToken,
    platform: registration.platform,
    device_id: registration.deviceId ?? null,
    device_name: registration.deviceName ?? null,
    app_version: registration.appVersion ?? null,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(rows, {
      onConflict: 'member_id,expo_push_token',
    })
    .select('*')

  if (error) throw new Error(error.message)

  return (data ?? []) as PushTokenRow[]
}

export async function deactivatePushTokensForMembers(
  expoPushToken: string,
  memberIds: string[],
): Promise<void> {
  if (!expoPushToken || memberIds.length === 0) return

  const { error } = await supabase
    .from('push_tokens')
    .update({
      is_active: false,
    })
    .eq('expo_push_token', expoPushToken)
    .in('member_id', memberIds)

  if (error) throw new Error(error.message)
}
