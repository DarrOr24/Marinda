// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/header-profile-button';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';
import Providers from '@/providers';


function RootNavigator() {
  const { isLoggedIn, member } = useAuthContext();
  const insets = useSafeAreaInsets();

  const firstName =
    member?.profile?.first_name ||
    member?.nickname ||
    'Account';

  const accountTitle = `${firstName}'s Account`;

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        headerRight: () => <HeaderProfileButton />,
        headerStyle: { backgroundColor: '#fff' },
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
            headerTitle: accountTitle,
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="profile/[id]"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
            headerTitle: accountTitle,
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen name="settings" options={{ headerTitle: "Settings ⚙️" }} />

        <Stack.Screen name="chores" options={{ headerTitle: 'Chores Game 🧹' }} />
        <Stack.Screen name="chores-info" options={{ headerTitle: 'How chore game works 🏁' }} />
        <Stack.Screen name="chores-settings" options={{ headerTitle: 'Chore Game Settings ⚙️' }} />

        <Stack.Screen name="wishlist" options={{ headerTitle: 'Wish List 💫' }} />
        <Stack.Screen
          name="wishlist-settings"
          options={{ headerTitle: 'Wishlist Settings ⚙️' }}
        />
        <Stack.Screen
          name="wishlist-info"
          options={{ headerTitle: 'How Wishlist Works 💫' }}
        />


        <Stack.Screen name="boards/activity" options={{ headerTitle: 'Activities 📆' }} />

        <Stack.Screen name="boards/announcements" options={{ headerTitle: 'Announcements 📢' }} />
        <Stack.Screen
          name="boards/announcements-info"
          options={{ headerTitle: 'How announcements work 📖' }}
        />
        <Stack.Screen
          name="boards/announcements-settings"
          options={{ headerTitle: "Announcements Settings ⚙️" }}
        />


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
    <SafeAreaProvider>
      <Providers>
        <SplashScreenController />
        <RootNavigator />
        <StatusBar style="dark" translucent={false} backgroundColor="#fff" />
      </Providers>
    </SafeAreaProvider>
  );
}
