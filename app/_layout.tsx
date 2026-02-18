// app/_layout.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthRouter } from '@/components/auth-router';
import { BackForwardButton } from '@/components/back-forward-button';
import { HeaderProfileButton } from '@/components/header-profile-button';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';
import Providers from '@/providers';


// Header title with icon (matches sidebar nav icons)
function HeaderWithIcon({
  title,
  icon,
  color = '#0f172a',
}: {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color?: string;
}) {
  return (
    <View style={headerStyles.row}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[headerStyles.title, { color }]}>{title}</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
});

export const rootNavigatorScreenOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  headerLeft: () => <BackForwardButton direction="back" size="sm" />,
  headerRight: () => <HeaderProfileButton />,
  headerStyle: { backgroundColor: '#fff' },
  headerTitleAlign: 'center',
  headerTitleStyle: { color: '#0f172a', fontWeight: '600' },
  headerTintColor: '#0f172a',
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
            headerTitle: () => (
              <HeaderWithIcon title="Chore Game" icon="clipboard-check-outline" color="#2563eb" />
            ),
          }}
        />

        <Stack.Screen
          name="chores-info"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="How chore game works" icon="clipboard-check-outline" color="#2563eb" />
            ),
          }}
        />

        <Stack.Screen
          name="chores-settings"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Chore Game Settings" icon="clipboard-check-outline" color="#2563eb" />
            ),
          }}
        />

        <Stack.Screen
          name="wishlist"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Wish List" icon="gift-outline" color="#db2777" />
            ),
          }}
        />

        <Stack.Screen
          name="wishlist-settings"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Wishlist Settings" icon="gift-outline" color="#db2777" />
            ),
          }}
        />

        <Stack.Screen
          name="wishlist-info"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="How Wishlist Works" icon="gift-outline" color="#db2777" />
            ),
          }}
        />

        <Stack.Screen
          name="boards/activity"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Activities" icon="calendar-month-outline" color="#7c3aed" />
            ),
          }}
        />

        <Stack.Screen
          name="boards/announcements"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Announcements" icon="bullhorn-outline" color="#f59e0b" />
            ),
          }}
        />

        <Stack.Screen
          name="boards/announcements-info"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="How announcements work" icon="bullhorn-outline" color="#f59e0b" />
            ),
          }}
        />

        <Stack.Screen
          name="boards/announcements-settings"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Announcements Settings" icon="bullhorn-outline" color="#f59e0b" />
            ),
          }}
        />

        <Stack.Screen
          name="boards/grocery"
          options={{
            headerTitle: () => (
              <HeaderWithIcon title="Groceries" icon="cart-outline" color="#16a34a" />
            ),
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
