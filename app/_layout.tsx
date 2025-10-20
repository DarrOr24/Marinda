import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { getSupabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  function hasOAuthCode(url: string) {
    try {
      const u = new URL(url);
      return u.searchParams.has('code');
    } catch { return false; }
  }

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const supabase = getSupabase();

    const handleUrl = async (url: string | null) => {
      if (!url || !hasOAuthCode(url)) return;
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) console.warn('exchangeCodeForSession error:', error.message);
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    (async () => handleUrl(await Linking.getInitialURL()))();
    return () => sub.remove();
  }, []);

  return <Stack />;
}
