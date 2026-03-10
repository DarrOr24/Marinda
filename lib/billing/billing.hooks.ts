// lib/billing/billing.hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useFamily } from '@/lib/families/families.hooks'
import type { FamilySubscription, SubscriptionPlan, SubscriptionStatus } from '@/lib/families/families.types'

import { syncRevenueCatBilling, type BillingSyncResult } from './billing.api'
import {
  getCustomerInfo,
  getOfferings,
  hasProEntitlement,
  purchasePackage,
  restorePurchases,
} from './revenuecat'
import { PRO_ENTITLEMENT_ID, type CustomerInfo, type PurchasesPackage } from './billing.types'

/** Query key for customer info (RevenueCat entitlements) */
export const CUSTOMER_INFO_QUERY_KEY = ['billing', 'customer-info']

/** Query key for offerings */
export const OFFERINGS_QUERY_KEY = ['billing', 'offerings']

function applyBillingSyncResultToCache(
  qc: ReturnType<typeof useQueryClient>,
  result: BillingSyncResult,
  familyIds: Array<string | null | undefined>,
) {
  const nowIso = new Date().toISOString()
  const uniqueFamilyIds = Array.from(
    new Set([...familyIds, ...result.familyIds].filter((familyId): familyId is string => !!familyId)),
  )

  for (const familyId of uniqueFamilyIds) {
    qc.setQueryData<FamilySubscription | null>(
      ['family-subscription', familyId],
      (current) => ({
        id: current?.id ?? `billing-sync:${familyId}`,
        family_id: familyId,
        plan: result.plan as SubscriptionPlan,
        status: result.status as SubscriptionStatus,
        product_id: current?.product_id ?? null,
        paying_profile_id: current?.paying_profile_id ?? null,
        expires_at: result.expiresAt,
        created_at: current?.created_at ?? nowIso,
        updated_at: nowIso,
      }),
    )
  }
}

async function invalidateBillingQueries(
  qc: ReturnType<typeof useQueryClient>,
  familyIds: Array<string | null | undefined>,
) {
  await qc.invalidateQueries({ queryKey: CUSTOMER_INFO_QUERY_KEY })

  for (const familyId of familyIds) {
    if (!familyId) continue
    await qc.invalidateQueries({ queryKey: ['family-subscription', familyId] })
    await qc.invalidateQueries({ queryKey: ['family', familyId] })
  }
}

async function syncBillingStateAfterPurchase(
  qc: ReturnType<typeof useQueryClient>,
  customerInfo: CustomerInfo,
  familyId?: string | null,
) {
  qc.setQueryData(CUSTOMER_INFO_QUERY_KEY, customerInfo)

  try {
    const result = await syncRevenueCatBilling(familyId)
    applyBillingSyncResultToCache(qc, result, [familyId])
    await invalidateBillingQueries(qc, [familyId, ...result.familyIds])
  } catch (error) {
    console.warn('[RevenueCat] billing sync failed:', error)
    await invalidateBillingQueries(qc, [familyId])
  }
}

/**
 * Fetch RevenueCat customer info. Use for client-side Pro check.
 */
export function useCustomerInfo() {
  return useQuery({
    queryKey: CUSTOMER_INFO_QUERY_KEY,
    queryFn: getCustomerInfo,
    staleTime: 60_000, // 1 min
  })
}

/**
 * Check if current user has Pro entitlement (from RevenueCat).
 */
export function useHasProEntitlement(): boolean {
  const { data } = useCustomerInfo()
  return hasProEntitlement(data ?? null)
}

/**
 * Fetch RevenueCat offerings (Pro monthly/yearly packages).
 */
export function useOfferings() {
  return useQuery({
    queryKey: OFFERINGS_QUERY_KEY,
    queryFn: getOfferings,
    staleTime: 5 * 60_000, // 5 min
  })
}

/**
 * Trigger a server-side RevenueCat -> Supabase sync for the active family.
 */
export function useSyncBillingState(familyId?: string | null) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => syncRevenueCatBilling(familyId),
    onSuccess: async (result) => {
      applyBillingSyncResultToCache(qc, result, [familyId])
      await invalidateBillingQueries(qc, [familyId, ...result.familyIds])
    },
  })
}

/**
 * Purchase a package. Invalidates customer-info and family-subscription on success.
 */
export function usePurchasePackage(familyId?: string | null) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (pkg: PurchasesPackage) => purchasePackage(pkg),
    onSuccess: async (customerInfo) => {
      await syncBillingStateAfterPurchase(qc, customerInfo, familyId)
    },
  })
}

/**
 * Restore purchases. Invalidates customer-info and family-subscription on success.
 */
export function useRestorePurchases(familyId?: string | null) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: restorePurchases,
    onSuccess: async (customerInfo) => {
      await syncBillingStateAfterPurchase(qc, customerInfo, familyId)
    },
  })
}

/**
 * Shared billing UI state composed from Supabase family billing data
 * and the current RevenueCat customer state.
 */
export function useBillingState(familyId?: string | null, profileId?: string | null) {
  const { family, familyMembers, familySubscription } = useFamily(familyId)
  const customerInfo = useCustomerInfo()
  const offerings = useOfferings()

  const familyData = family.data
  const members = familyMembers.data ?? []
  const subscription = familySubscription.data
  const billingOwnerId = familyData?.billing_owner_id ?? null
  const isBillingOwner = Boolean(billingOwnerId && profileId === billingOwnerId)

  const proEntitlement = customerInfo.data?.entitlements.active[PRO_ENTITLEMENT_ID]
  const hasActiveEntitlement = hasProEntitlement(customerInfo.data ?? null)
  const serverPlan = subscription?.plan ?? 'basic'
  const effectivePlan: SubscriptionPlan =
    serverPlan === 'pro' || hasActiveEntitlement ? 'pro' : 'basic'
  const isSubscriptionOutOfSync = hasActiveEntitlement !== (serverPlan === 'pro')
  const effectiveExpiresAt =
    subscription?.expires_at ??
    proEntitlement?.expirationDate ??
    null

  const defaultOffering = offerings.data?.current
  const packages = defaultOffering?.availablePackages ?? []
  const monthlyPkg = packages.find((pkg) => pkg.packageType === 'MONTHLY')
  const annualPkg = packages.find((pkg) => pkg.packageType === 'ANNUAL')

  return {
    family,
    familyMembers,
    familySubscription,
    customerInfo,
    offerings,
    familyData,
    members,
    subscription,
    billingOwnerId,
    isBillingOwner,
    serverPlan,
    effectivePlan,
    effectiveExpiresAt,
    hasActiveEntitlement,
    isSubscriptionOutOfSync,
    packages,
    monthlyPkg,
    annualPkg,
    canPurchasePro: packages.length > 0,
  }
}
