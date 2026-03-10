// lib/billing/revenuecat.ts
import { Platform } from 'react-native'
import Purchases, { type CustomerInfo, type PurchasesOfferings, type PurchasesPackage } from 'react-native-purchases'

import { isDebugEnabled } from '@/lib/debug'

import { PRO_ENTITLEMENT_ID } from './billing.types'

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

function getApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null
  }
  return null
}

let isConfigured = false

function getRevenueCatLogLevel() {
  return isDebugEnabled('revenuecat')
    ? Purchases.LOG_LEVEL.DEBUG
    : Purchases.LOG_LEVEL.WARN
}

/**
 * Configure RevenueCat. Call once on app start (after auth is known).
 * Skips on web (IAP not supported).
 */
export function configureRevenueCat(appUserId?: string | null): void {
  if (!isNative) return

  const apiKey = getApiKey()
  if (!apiKey) return

  try {
    Purchases.setLogLevel(getRevenueCatLogLevel())

    Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    })
    isConfigured = true
  } catch (e) {
    console.warn('[RevenueCat] configure failed:', e)
  }
}

/**
 * Identify the user with RevenueCat. Call after login.
 * Uses auth.users.id so the webhook can map to profile/family.
 */
export async function identifyRevenueCatUser(authUserId: string): Promise<void> {
  if (!isNative || !isConfigured) return

  try {
    await Purchases.logIn(authUserId)
  } catch (e) {
    console.warn('[RevenueCat] logIn failed:', e)
  }
}

/**
 * Log out from RevenueCat. Call on sign out.
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isNative || !isConfigured) return

  try {
    await Purchases.logOut()
  } catch (e) {
    console.warn('[RevenueCat] logOut failed:', e)
  }
}

/**
 * Fetch available offerings (Basic/Pro plans). Returns null on web or if not configured.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isNative || !isConfigured) return null

  try {
    return await Purchases.getOfferings()
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e)
    return null
  }
}

/**
 * Purchase a package (e.g. Pro monthly/yearly).
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  if (!isNative || !isConfigured) {
    throw new Error('Purchases are not available on this platform')
  }

  const result = await Purchases.purchasePackage(pkg)
  return result.customerInfo
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  if (!isNative || !isConfigured) {
    throw new Error('Restore is not available on this platform')
  }

  return await Purchases.restorePurchases()
}

/**
 * Get current customer info (entitlements).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative || !isConfigured) return null

  try {
    return await Purchases.getCustomerInfo()
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed:', e)
    return null
  }
}

/**
 * Check if the user has active Pro entitlement (from RevenueCat).
 * Use this for client-side checks; server/webhook keeps family_subscriptions in sync.
 */
export function hasProEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false
  const pro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]
  return !!pro
}
