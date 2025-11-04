import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';
import Providers from '@/providers';


function RootNavigator() {
  const { isLoggedIn } = useAuthContext();

  return (
    <Stack
      screenOptions={{
        animation: 'none',
        headerRight: () => <HeaderProfileButton />, // profile/login icon everywhere
      }}
    >
      <Stack.Protected guard={isLoggedIn}>
        {/* Home: show header, but no back button */}
        <Stack.Screen
          name="index"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />

        {/* Profile pages: show header, but no back button */}
        <Stack.Screen
          name="profile/[id]"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />

        {/* Other screens keep normal headers (and keep the profile icon on the right) */}
        <Stack.Screen
          name="chores"
          options={{
            headerTitle: 'Chores 🧹',
          }}
        />
        <Stack.Screen
          name="wishList"
          options={{
            headerTitle: 'Wish List 💫',
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
          name="boards/grocery"
          options={{
            headerTitle: 'Groceries 🛒',
          }}
        />
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
      <StatusBar style="auto" />
    </Providers>
  )
}
