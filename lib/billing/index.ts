export {
  configureRevenueCat,
  identifyRevenueCatUser,
  logoutRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  hasProEntitlement,
} from './revenuecat'

export type { CustomerInfo, PurchasesOfferings, PurchasesPackage, PurchasesOffering } from './billing.types'
export { PRO_ENTITLEMENT_ID } from './billing.types'
export { syncRevenueCatBilling } from './billing.api'

export {
  useBillingState,
  useCustomerInfo,
  useHasProEntitlement,
  useOfferings,
  usePurchasePackage,
  useRestorePurchases,
  useSyncBillingState,
  CUSTOMER_INFO_QUERY_KEY,
  OFFERINGS_QUERY_KEY,
} from './billing.hooks'
