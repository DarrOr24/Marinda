// Re-export RevenueCat types we use
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesOffering,
} from 'react-native-purchases'

export type { CustomerInfo, PurchasesOfferings, PurchasesPackage, PurchasesOffering }

/** Entitlement identifier in RevenueCat (e.g. "pro") */
export const PRO_ENTITLEMENT_ID = 'pro'
