// lib/errors.ts
import { Alert } from "react-native";

/**
 * Extract a user-facing message from a Supabase functions.invoke error/response.
 * Handles: error.details (JSON body), data?.error (when error is set), error.message.
 */
export function getInvokeErrorMessage(
  error: unknown,
  data?: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  // When edge function returns 200 with { ok: false, error: "..." }, data may still be set
  const dataObj = data as { error?: string } | null | undefined;
  if (dataObj?.error && typeof dataObj.error === "string") {
    return dataObj.error;
  }

  const err = error as
    | { message?: string; details?: string }
    | null
    | undefined;
  if (!err) return fallback;

  let message = err.message ?? fallback;

  // Supabase sometimes puts the response body in error.details
  const rawDetails = err.details;
  if (rawDetails && typeof rawDetails === "string") {
    try {
      const parsed = JSON.parse(rawDetails) as { error?: string };
      if (parsed?.error && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      // not JSON; keep message
    }
  }

  return message;
}

/**
 * Show a native alert for a Supabase functions.invoke error using getInvokeErrorMessage.
 */
export function showInvokeErrorAlert(
  title: string,
  error: unknown,
  data?: unknown,
  fallbackMessage?: string,
): void {
  const message = getInvokeErrorMessage(error, data, fallbackMessage);
  Alert.alert(title, message);
}
