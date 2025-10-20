import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

type Extra = { supabaseUrl: string; supabaseAnonKey: string };
const extra = (Constants?.expoConfig?.extra ?? {}) as Partial<Extra>;

export const redirectTo = Linking.createURL('auth-callback');

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = extra.supabaseUrl!;
  const supabaseAnonKey = extra.supabaseAnonKey!;

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });

  return _client;
}
