// app/settings/billing.tsx
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'

import { Button, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
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

export default function BillingSettingsScreen() {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const { effectiveMember, activeFamilyId, profileId, hasParentPermissions } = useAuthContext()
  const familyId = activeFamilyId ?? effectiveMember?.family_id
  const mutationFamilyId = familyId ?? ''
  const myProfileId = profileId ?? effectiveMember?.profile_id

  const setBillingOwner = useSetBillingOwner(mutationFamilyId)
  const {
    family,
    familyData,
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
    : t('settings.billing.unknown')
  const planLabel = t(plan === 'pro' ? 'settings.billing.plans.pro' : 'settings.billing.plans.basic')

  const otherParents = members.filter(
    (m) =>
      isParentRole(m.role) &&
      m.profile_id !== billingOwnerId &&
      m.profile_id !== myProfileId,
  )

  function handleUpgradeToPro(pkg: PurchasesPackage) {
    purchasePackage.mutate(pkg, {
      onError: (e) => {
        const msg = (e as Error)?.message ?? t('settings.billing.purchaseFailed')
        if (!msg.toLowerCase().includes('cancel')) {
          Alert.alert(t('settings.billing.purchaseFailed'), msg)
        }
      },
    })
  }

  function handleRestore() {
    restorePurchases.mutate(undefined, {
      onSuccess: () => {
        Alert.alert(t('settings.billing.restoredTitle'), t('settings.billing.restoredMessage'))
      },
      onError: (e) => {
        Alert.alert(t('settings.billing.restoreFailed'), (e as Error)?.message ?? t('settings.common.pleaseTryAgain'))
      },
    })
  }

  function handleRefreshBilling() {
    syncBillingState.mutate(undefined, {
      onSuccess: () => {
        Alert.alert(t('settings.billing.billingRefreshedTitle'), t('settings.billing.billingRefreshedMessage'))
      },
      onError: (e) => {
        Alert.alert(t('settings.billing.syncFailed'), (e as Error)?.message ?? t('settings.billing.syncFailedFallback'))
      },
    })
  }

  function handleChangeBillingOwner(m: FamilyMember) {
    if (!setBillingOwner || !m.profile_id) return
    const name = memberDisplayName(m)
    Alert.alert(
      t('settings.billing.changeOwnerTitle'),
      t('settings.billing.changeOwnerMessage', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.common.change'),
          onPress: () =>
            setBillingOwner.mutate(m.profile_id!, {
              onError: (e) =>
                Alert.alert(
                  t('settings.billing.failed'),
                  (e as Error)?.message ?? t('settings.billing.ownerFailedFallback'),
                ),
            }),
        },
      ],
    )
  }

  if (family.isLoading && !familyData) {
    return (
      <ScreenState
        title={t('settings.billing.title')}
        description={t('settings.billing.loading')}
        showActivityIndicator
        withBackground={false}
      />
    )
  }

  return (
    <Screen>
      <Text style={[styles.sectionTitle, r.textAlignStart, r.writingDirection]}>{t('settings.billing.title')}</Text>
      <Text style={[styles.sectionSubtitle, r.textAlignStart, r.writingDirection]}>
        {t('settings.billing.subtitle')}
      </Text>

      {/* Current plan */}
      <View style={styles.card}>
        <Text style={[styles.cardLabel, r.textAlignStart, r.writingDirection]}>{t('settings.billing.currentPlan')}</Text>
        <Text style={[styles.cardValue, r.textAlignStart, r.writingDirection]}>{planLabel}</Text>
        {effectiveExpiresAt && plan === 'pro' && (
          <Text style={[styles.cardHint, r.textAlignStart, r.writingDirection]}>
            {t('settings.billing.renews', { date: new Date(effectiveExpiresAt).toLocaleDateString() })}
          </Text>
        )}
        {isSubscriptionOutOfSync && (
          <View style={styles.syncNotice}>
            <Text style={[styles.cardHint, r.textAlignStart, r.writingDirection]}>
              {t('settings.billing.syncing')}
            </Text>
            <Button
              title={syncBillingState.isPending ? t('settings.billing.refreshing') : t('settings.billing.refreshSubscription')}
              type="outline"
              size="sm"
              onPress={handleRefreshBilling}
              disabled={syncBillingState.isPending}
            />
          </View>
        )}
      </View>

      {/* Billing owner (parents only) */}
      {hasParentPermissions && (
        <View style={styles.card}>
          <Text style={[styles.cardLabel, r.textAlignStart, r.writingDirection]}>{t('settings.billing.billingOwner')}</Text>
          <Text style={[styles.cardValue, r.textAlignStart, r.writingDirection]}>{billingOwnerName}</Text>
          <Text style={[styles.cardHint, r.textAlignStart, r.writingDirection]}>
            {t('settings.billing.billingOwnerHint')}
          </Text>

          {otherParents.length > 0 && (
            <View style={styles.changeOwnerSection}>
              <Text style={[styles.changeOwnerLabel, r.textAlignStart, r.writingDirection]}>{t('settings.billing.changeBillingOwner')}</Text>
              {otherParents.map((m) => (
                <Button
                  key={m.id}
                  title={t('settings.billing.makeBillingOwner', { name: memberDisplayName(m) })}
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
      {hasParentPermissions && isBillingOwner && (
        <View style={styles.card}>
          <Text style={[styles.cardLabel, r.textAlignStart, r.writingDirection]}>
            {plan === 'pro' ? t('settings.billing.manageSubscription') : t('settings.billing.upgradeToPro')}
          </Text>

          {plan === 'pro' ? (
            <View style={styles.proActions}>
              <Button
                title={restorePurchases.isPending ? t('settings.billing.restoring') : t('settings.billing.restorePurchases')}
                type="outline"
                size="lg"
                fullWidth
                onPress={handleRestore}
                disabled={restorePurchases.isPending}
              />
              <Text style={[styles.manageHint, r.textAlignStart, r.writingDirection]}>
                {t('settings.billing.manageHint')}
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
                          ? t('settings.billing.processing')
                          : monthlyPkg.product.priceString
                            ? t('settings.billing.perMonth', { price: monthlyPkg.product.priceString })
                            : t('settings.billing.monthly')
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
                          ? t('settings.billing.perYear', { price: annualPkg.product.priceString })
                          : t('settings.billing.yearly')
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
            <Text style={[styles.proFallback, r.textAlignStart, r.writingDirection]}>
              {t('settings.billing.noPackages')}
            </Text>
          )}
        </View>
      )}

      {!hasParentPermissions && (
        <Text style={[styles.sectionSubtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.billing.parentsOnly')}
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
