// app/settings/billing.tsx
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  useBillingState,
  usePurchasePackage,
  useRestorePurchases,
  useSyncBillingState,
} from '@/lib/billing'
import type { PurchasesPackage } from '@/lib/billing'
import { useSetBillingOwner } from '@/lib/families/families.hooks'
import type { FamilyMember } from '@/lib/members/members.types'
import { memberDisplayName } from '@/utils/format.utils'
import { isParentRole } from '@/utils/validation.utils'

function formatPlan(plan: string): string {
  return plan === 'pro' ? 'Pro' : 'Basic'
}

export default function BillingSettingsScreen() {
  const { member, activeFamilyId, profileId } = useAuthContext()
  const familyId = activeFamilyId ?? member?.family_id
  const myRole = member?.role
  const myProfileId = profileId ?? member?.profile_id
  const isParent = isParentRole(myRole)

  const setBillingOwner = familyId ? useSetBillingOwner(familyId) : null
  const {
    family,
    familyData,
    subscription,
    members,
    billingOwnerId,
    isBillingOwner,
    effectivePlan: plan,
    effectiveExpiresAt,
    isSubscriptionOutOfSync,
    canPurchasePro,
    monthlyPkg,
    annualPkg,
    offerings,
  } = useBillingState(familyId, myProfileId)
  const purchasePackage = usePurchasePackage(familyId ?? null)
  const restorePurchases = useRestorePurchases(familyId ?? null)
  const syncBillingState = useSyncBillingState(familyId ?? null)

  const billingOwnerMember = members.find((m) => m.profile_id === billingOwnerId)
  const billingOwnerName = billingOwnerMember
    ? memberDisplayName(billingOwnerMember as FamilyMember)
    : 'Unknown'

  const otherParents = members.filter(
    (m) =>
      isParentRole(m.role) &&
      m.profile_id !== billingOwnerId &&
      m.profile_id !== myProfileId,
  )

  function handleUpgradeToPro(pkg: PurchasesPackage) {
    purchasePackage.mutate(pkg, {
      onError: (e) => {
        const msg = (e as Error)?.message ?? 'Purchase failed.'
        if (!msg.toLowerCase().includes('cancel')) {
          Alert.alert('Purchase failed', msg)
        }
      },
    })
  }

  function handleRestore() {
    restorePurchases.mutate(undefined, {
      onSuccess: () => {
        Alert.alert('Restored', 'Your purchases have been restored.')
      },
      onError: (e) => {
        Alert.alert('Restore failed', (e as Error)?.message ?? 'Please try again.')
      },
    })
  }

  function handleRefreshBilling() {
    syncBillingState.mutate(undefined, {
      onSuccess: () => {
        Alert.alert('Billing refreshed', 'Subscription state was synced with RevenueCat.')
      },
      onError: (e) => {
        Alert.alert('Sync failed', (e as Error)?.message ?? 'Could not refresh billing.')
      },
    })
  }

  function handleChangeBillingOwner(m: FamilyMember) {
    if (!setBillingOwner || !m.profile_id) return
    const name = memberDisplayName(m)
    Alert.alert(
      'Change billing owner',
      `Make ${name} the billing owner? The subscription will reset to Basic until they subscribe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: () =>
            setBillingOwner.mutate(m.profile_id!, {
              onError: (e) =>
                Alert.alert(
                  'Failed',
                  (e as Error)?.message ?? 'Could not update billing owner.',
                ),
            }),
        },
      ],
    )
  }

  if (!familyId) {
    return (
      <Screen>
        <Text style={styles.sectionTitle}>Billing</Text>
        <Text style={styles.sectionSubtitle}>
          You are not attached to a family. Join or create a family first.
        </Text>
      </Screen>
    )
  }

  if (family.isLoading && !familyData) {
    return (
      <Screen>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.sectionTitle}>Billing</Text>
      <Text style={styles.sectionSubtitle}>
        Manage subscription and billing for your family.
      </Text>

      {/* Current plan */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Current plan</Text>
        <Text style={styles.cardValue}>{formatPlan(plan)}</Text>
        {effectiveExpiresAt && plan === 'pro' && (
          <Text style={styles.cardHint}>
            Renews {new Date(effectiveExpiresAt).toLocaleDateString()}
          </Text>
        )}
        {isSubscriptionOutOfSync && (
          <View style={styles.syncNotice}>
            <Text style={styles.cardHint}>
              Subscription status is still syncing with RevenueCat.
            </Text>
            <Button
              title={syncBillingState.isPending ? 'Refreshing…' : 'Refresh subscription'}
              type="outline"
              size="sm"
              onPress={handleRefreshBilling}
              disabled={syncBillingState.isPending}
            />
          </View>
        )}
      </View>

      {/* Billing owner (parents only) */}
      {isParent && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Billing owner</Text>
          <Text style={styles.cardValue}>{billingOwnerName}</Text>
          <Text style={styles.cardHint}>
            The billing owner pays for Pro. Only parents can be billing owners.
          </Text>

          {otherParents.length > 0 && (
            <View style={styles.changeOwnerSection}>
              <Text style={styles.changeOwnerLabel}>Change billing owner</Text>
              {otherParents.map((m) => (
                <Button
                  key={m.id}
                  title={`Make ${memberDisplayName(m)} billing owner`}
                  type="outline"
                  size="sm"
                  onPress={() => handleChangeBillingOwner(m)}
                  disabled={setBillingOwner?.isPending}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Subscribe / Manage (billing owner only) */}
      {isParent && isBillingOwner && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {plan === 'pro' ? 'Manage subscription' : 'Upgrade to Pro'}
          </Text>

          {plan === 'pro' ? (
            <View style={styles.proActions}>
              <Button
                title={restorePurchases.isPending ? 'Restoring…' : 'Restore purchases'}
                type="outline"
                size="lg"
                fullWidth
                onPress={handleRestore}
                disabled={restorePurchases.isPending}
              />
              <Text style={styles.manageHint}>
                To cancel or change payment, open Settings → Subscriptions on your
                device.
              </Text>
            </View>
          ) : canPurchasePro ? (
            <View style={styles.proButtons}>
              {offerings.isLoading ? (
                <ActivityIndicator style={{ marginVertical: 12 }} />
              ) : (
                <>
                  {monthlyPkg && (
                    <Button
                      title={
                        purchasePackage.isPending
                          ? 'Processing…'
                          : monthlyPkg.product.priceString
                            ? `${monthlyPkg.product.priceString}/month`
                            : 'Monthly'
                      }
                      type="primary"
                      size="lg"
                      fullWidth
                      onPress={() => handleUpgradeToPro(monthlyPkg)}
                      disabled={purchasePackage.isPending}
                    />
                  )}
                  {annualPkg && (
                    <Button
                      title={
                        annualPkg.product.priceString
                          ? `${annualPkg.product.priceString}/year`
                          : 'Yearly'
                      }
                      type="primary"
                      size="lg"
                      fullWidth
                      onPress={() => handleUpgradeToPro(annualPkg)}
                      disabled={purchasePackage.isPending}
                    />
                  )}
                </>
              )}
            </View>
          ) : (
            <Text style={styles.proFallback}>
              No Pro packages available. Configure RevenueCat or enable dev mode.
            </Text>
          )}
        </View>
      )}

      {!isParent && (
        <Text style={styles.sectionSubtitle}>
          Only parents can manage billing. Ask your family’s billing owner to
          make changes.
        </Text>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingText: { fontSize: 13, color: '#64748b' },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  cardHint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  syncNotice: { marginTop: 12, gap: 8 },
  changeOwnerSection: { marginTop: 12, gap: 8 },
  changeOwnerLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  proActions: { marginTop: 8, gap: 8 },
  proButtons: { marginTop: 8, gap: 10 },
  proFallback: { fontSize: 13, color: '#64748b', marginTop: 8 },
  manageHint: { fontSize: 12, color: '#94a3b8' },
})
