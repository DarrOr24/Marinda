import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

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
const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null)
    return Promise.resolve(window.localStorage.getItem(key))
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve()
    window.localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve()
    window.localStorage.removeItem(key)
    return Promise.resolve()
  },
}

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = extra.supabaseUrl!;
  const supabaseAnonKey = extra.supabaseAnonKey!;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env. Check app.config.ts -> extra.supabaseUrl/AnonKey');
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === 'web' ? WebStorageAdapter : NativeSecureStoreAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(Platform.OS !== 'web' ? { flowType: 'pkce' } : {})
    },
  });

  return _client;
}
