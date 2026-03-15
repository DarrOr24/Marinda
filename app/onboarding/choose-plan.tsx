// app/onboarding/choose-plan.tsx
import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Button, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  useOfferings,
  usePurchasePackage,
} from '@/lib/billing'
import type { PurchasesPackage } from '@/lib/billing'

export default function ChoosePlanScreen() {
  const router = useRouter()
  const { activeFamilyId } = useAuthContext()
  const offerings = useOfferings()
  const purchasePackage = usePurchasePackage(activeFamilyId ?? null)

  const defaultOffering = offerings.data?.current
  const packages = defaultOffering?.availablePackages ?? []
  const monthlyPkg = packages.find((p) => p.packageType === 'MONTHLY')
  const annualPkg = packages.find((p) => p.packageType === 'ANNUAL')

  function onChooseBasic() {
    router.replace('/')
  }

  function onChoosePro(pkg: PurchasesPackage) {
    purchasePackage.mutate(pkg, {
      onSuccess: () => router.replace('/'),
      onError: (e) => {
        const msg = (e as Error)?.message ?? 'Purchase failed. Please try again.'
        if (msg.includes('cancelled') || msg.toLowerCase().includes('cancel')) {
          return // user cancelled, no alert
        }
        Alert.alert('Purchase failed', msg)
      },
    })
  }

  if (!activeFamilyId) {
    return (
      <ScreenState
        title="Choose a plan"
        description="Loading your family setup."
        showActivityIndicator
        withBackground={false}
      />
    )
  }

  return (
    <Screen withBackground={false}>
      <Text style={styles.title}>Congratulations! Your family has been created successfully</Text>
      <Text style={styles.subtitle}>
        Start on Basic for free or upgrade to Pro.
      </Text>

      {/* Basic */}
      <View style={styles.planCard}>
        <Text style={styles.planName}>Basic</Text>
        <Text style={styles.planPrice}>Free</Text>
        <Text style={styles.planDesc}>
          Core family features. Upgrade to Pro for premium tools.
        </Text>
        <Button
          title="Continue with Basic"
          type="outline"
          size="lg"
          fullWidth
          onPress={onChooseBasic}
        />
      </View>

      {/* Pro */}
      <View style={[styles.planCard, styles.planCardPro]}>
        <Text style={styles.planName}>Pro</Text>
        <Text style={styles.planDesc}>Premium features for your family.</Text>

        {offerings.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 12 }} />
        ) : packages.length === 0 ? (
          <Text style={styles.proFallback}>
            No Pro packages available. Continue with Basic.
          </Text>
        ) : (
          <View style={styles.proButtons}>
            {monthlyPkg && (
              <Button
                title={
                  purchasePackage.isPending
                    ? 'Processing…'
                    : monthlyPkg.product.priceString
                      ? `${monthlyPkg.product.priceString}/mo`
                      : 'Monthly'
                }
                type="primary"
                size="lg"
                fullWidth
                onPress={() => onChoosePro(monthlyPkg)}
                disabled={purchasePackage.isPending}
              />
            )}
            {annualPkg && (
              <Button
                title={
                  annualPkg.product.priceString
                    ? `${annualPkg.product.priceString}/yr`
                    : 'Yearly (save)'
                }
                type="primary"
                size="lg"
                fullWidth
                onPress={() => onChoosePro(annualPkg)}
                disabled={purchasePackage.isPending}
              />
            )}
          </View>
        )}
      </View>

    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 8 },
  planCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  planCardPro: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  planName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  planPrice: { fontSize: 22, fontWeight: '700', color: '#0284c7' },
  planDesc: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  proFallback: { fontSize: 13, color: '#64748b', marginVertical: 12 },
  proButtons: { gap: 10 },
})
