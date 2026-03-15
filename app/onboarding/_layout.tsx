import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { StepsBar } from '@/components/onboarding/steps-bar'


const STEPS_TOTAL = 4

export default function OnboardingLayout() {
  const segments = useSegments()

  const last = segments[segments.length - 1]

  const step =
    last === 'details'
      ? 1
      : last === 'create-or-join'
        ? 2
        : last === 'create'
          ? 3
          : last === 'choose-plan' || last === 'join'
            ? 4
            : null

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {step ? <StepsBar step={step} total={STEPS_TOTAL} /> : null}

      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
          <Stack.Screen name="details" />
          <Stack.Screen name="select-family" />
          <Stack.Screen name="create-or-join" />
          <Stack.Screen name="create" />
          <Stack.Screen name="choose-plan" />
          <Stack.Screen name="join" />
          <Stack.Screen name="accept-invite" />
        </Stack>
      </View>
    </SafeAreaView>
  )
}
