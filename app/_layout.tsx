// app/_layout.tsx
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthRouter } from '@/components/auth-router';
import { BackForwardButton } from '@/components/back-forward-button';
import { HeaderProfileButton } from '@/components/header-profile-button';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';
import Providers from '@/providers';


export const rootNavigatorScreenOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  headerLeft: () => <BackForwardButton direction="back" size="sm" />,
  headerRight: () => <HeaderProfileButton />,
  headerStyle: { backgroundColor: '#fff' },
  headerTitleAlign: 'center',
  headerShadowVisible: false,
}

function RootNavigator() {
  const { isLoggedIn, profile } = useAuthContext();

  const firstName =
    profile?.first_name ||
    profile?.last_name ||
    'Account';

  const accountTitle = `${firstName}'s Account`;

  return (

    <Stack screenOptions={rootNavigatorScreenOptions}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="index"
          options={{
            headerLeft: () => null,
            headerTitle: accountTitle,
          }}
        />

        <Stack.Screen
          name="profile/[id]"
          options={{
            headerLeft: () => null,
            headerTitle: accountTitle,
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="chores"
          options={{
            headerTitle: 'Chore Game 🧹',
          }}
        />

        <Stack.Screen
          name="chores-info"
          options={{
            headerTitle: 'How chore game works 🏁',
          }}
        />

        <Stack.Screen
          name="chores-settings"
          options={{
            headerTitle: 'Chore Game Settings ⚙️',
          }}
        />

        <Stack.Screen
          name="wishlist"
          options={{
            headerTitle: 'Wish List 💫',
          }}
        />

        <Stack.Screen
          name="wishlist-settings"
          options={{
            headerTitle: 'Wishlist Settings ⚙️',
          }}
        />

        <Stack.Screen
          name="wishlist-info"
          options={{
            headerTitle: 'How Wishlist Works 💫',
          }}
        />

        <Stack.Screen
          name="boards/activity"
          options={{
            headerTitle: 'Activities 📆',
          }}
        />

        <Stack.Screen
          name="boards/announcements"
          options={{
            headerTitle: 'Announcements 📢',
          }}
        />

        <Stack.Screen
          name="boards/announcements-info"
          options={{
            headerTitle: 'How announcements work 📖',
          }}
        />

        <Stack.Screen
          name="boards/announcements-settings"
          options={{
            headerTitle: 'Announcements Settings ⚙️',
          }}
        />

        <Stack.Screen
          name="boards/grocery"
          options={{
            headerTitle: 'Groceries 🛒',
          }}
        />

      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Invite: reachable when logged in (accept flow) or not (persist token → login) */}
      <Stack.Screen
        name="invite"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <SplashScreenController />
        <AuthRouter />
        <RootNavigator />
        <StatusBar style="dark" translucent={false} backgroundColor="#fff" />
      </Providers>
    </SafeAreaProvider>
  );
}
