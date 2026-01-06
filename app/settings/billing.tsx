// app/settings/billing.tsx
import { StyleSheet, Text, View } from 'react-native'

import { Screen } from '@/components/ui/screen'


export default function BillingSettingsScreen() {
  return (
    <Screen>
      <Text style={styles.sectionTitle}>Billing</Text>
      <Text style={styles.sectionSubtitle}>
        In the future this will show your subscription, renewal date and payment
        methods.
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Billing isn’t fully implemented yet – for now this is just a preview
          tab.
        </Text>
      </View>
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
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
})
