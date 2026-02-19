import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export const redirectTo = Linking.createURL("auth-callback");

let _client: SupabaseClient | null = null;

// Web: small adapter (optional but keeps parity & allows logging)
const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve(null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env",
    );
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === "web" ? WebStorageAdapter : AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(Platform.OS !== "web" ? { flowType: "pkce" } : {}),
    },
  });

  return _client;
}
