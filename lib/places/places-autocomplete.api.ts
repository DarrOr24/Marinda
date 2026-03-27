import { getSupabase } from "@/lib/supabase";

export type PlaceSuggestion = { description: string; placeId: string };

/**
 * Calls Edge Function `places_autocomplete` (logged-in users only).
 */
export async function fetchPlacesAutocomplete(
  input: string,
): Promise<PlaceSuggestion[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(
    "places_autocomplete",
    {
      body: { input: q },
    },
  );

  if (error) {
    console.warn("places_autocomplete", error.message);
    return [];
  }

  const payload = data as {
    ok?: boolean;
    suggestions?: PlaceSuggestion[];
  } | null;

  if (!payload?.ok || !Array.isArray(payload.suggestions)) return [];
  return payload.suggestions;
}
