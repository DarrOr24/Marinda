import { Stack, useSegments } from 'expo-router'

import { StepsBar } from '@/components/onboarding/steps-bar'
import { View } from 'react-native'


const STEPS_TOTAL = 3

export default function OnboardingLayout() {
  const segments = useSegments()

  const last = segments[segments.length - 1]

  const step =
    last === 'details' ? 1 :
      last === 'create-or-join' ? 2 :
        last === 'create' || last === 'join' ? 3 :
          null



  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {step ? <StepsBar step={step} total={STEPS_TOTAL} /> : null}

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="details" />
        <Stack.Screen name="select-family" />
        <Stack.Screen name="create-or-join" />
        <Stack.Screen name="create" />
        <Stack.Screen name="join" />
        <Stack.Screen name="accept-invite" />
      </Stack>
    </View>
  )
}
