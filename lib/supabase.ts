import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  type FunctionInvokeOptions,
  type SupabaseClient,
} from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { getInvokeErrorMessage } from "@/lib/errors";

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

type SuccessfulFunctionResponse = {
  ok: boolean
}

export async function invokeAuthenticatedFunction<TResult extends SuccessfulFunctionResponse>({
  functionName,
  body,
  errorMessage,
}: {
  functionName: string
  body: FunctionInvokeOptions["body"]
  errorMessage: string
}): Promise<TResult> {
  const supabase = getSupabase()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (sessionError || !accessToken) {
    throw new Error("You must be signed in to perform this action.")
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error || !data?.ok) {
    throw new Error(getInvokeErrorMessage(error, data, errorMessage))
  }

  return data as TResult
}
