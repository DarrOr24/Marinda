import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { SplashScreenController } from '@/components/splash-screen-controller';
import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';


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
        <Stack.Screen name="chores" />
        <Stack.Screen name="wishList" />
        <Stack.Screen name="boards/activity" />
        <Stack.Screen name="boards/announcements" />
        <Stack.Screen name="boards/grocery" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}




export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SplashScreenController />
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  )
}
