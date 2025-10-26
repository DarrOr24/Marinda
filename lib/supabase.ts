import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Extra = { supabaseUrl: string; supabaseAnonKey: string };
const extra = (Constants?.expoConfig?.extra ?? {}) as Partial<Extra>;

export const redirectTo = Linking.createURL('auth-callback');

let _client: SupabaseClient | null = null;

// Native: encrypted storage
const NativeSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Web: small adapter (optional but keeps parity & allows logging)
const ExpoWebSecureStoreAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = extra.supabaseUrl!;
  const supabaseAnonKey = extra.supabaseAnonKey!;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env. Check app.config.ts -> extra.supabaseUrl/AnonKey');
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage:
        Platform.OS === 'web' ? ExpoWebSecureStoreAdapter : (NativeSecureStoreAdapter as any),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return _client;
}
