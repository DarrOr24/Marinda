import { getInvokeErrorMessage } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase'

import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/families/families.types'

export type BillingSyncResult = {
  ok: true
  synced: boolean
  familyIds: string[]
  plan: SubscriptionPlan
  status: SubscriptionStatus
  expiresAt: string | null
}

export async function syncRevenueCatBilling(familyId?: string | null): Promise<BillingSyncResult> {
  const supabase = getSupabase()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (sessionError || !accessToken) {
    throw new Error('You must be signed in to sync billing state.')
  }

  const { data, error } = await supabase.functions.invoke('revenuecat_billing_sync', {
    body: familyId ? { familyId } : {},
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error || !data?.ok) {
    throw new Error(
      getInvokeErrorMessage(error, data, 'Could not sync billing state right now.'),
    )
  }

  return data as BillingSyncResult
}
