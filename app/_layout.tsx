// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import HeaderProfileButton from '@/components/header-profile-button';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';

import Providers from '@/providers';

function RootNavigator() {
  const { isLoggedIn } = useAuthContext();

  return (
    <Stack
      screenOptions={{
        animation: 'none',
        headerRight: () => <HeaderProfileButton />,   // keep your profile button
        headerStyle: { backgroundColor: '#fff' },     // solid header bg
        headerTitleAlign: 'center',
        headerShadowVisible: false,
      }}
    >
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="index"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="profile/[id]"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen name="chores" options={{ headerTitle: 'Chores Game 🧹' }} />
        <Stack.Screen name="chores-info" options={{ headerTitle: 'How chore game works 🏁' }} />
        <Stack.Screen name="chores-settings" options={{ headerTitle: 'Chore Game Settings ⚙️' }} />

        <Stack.Screen name="wishList" options={{ headerTitle: 'Wish List 💫' }} />
        <Stack.Screen name="boards/activity" options={{ headerTitle: 'Activities 📆' }} />
        <Stack.Screen name="boards/announcements" options={{ headerTitle: 'Announcements 📢' }} />
        <Stack.Screen name="boards/grocery" options={{ headerTitle: 'Groceries 🛒' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <SplashScreenController />
      <RootNavigator />
      {/* Non-translucent so the OS reserves space for the status bar */}
      <StatusBar style="dark" translucent={false} backgroundColor="#fff" />
    </Providers>
  );
}
