/// <reference types="https://deno.land/x/types/index.d.ts" />

/**
 * Proxies Google Places Autocomplete (New) for logged-in users only.
 * Secret: GOOGLE_PLACES_API_KEY (set in Supabase Dashboard → Edge Functions → Secrets).
 */

import { createClient } from "npm:@supabase/supabase-js@2";

type Suggestion = { description: string; placeId: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function assertEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeSuggestions(data: unknown): Suggestion[] {
  const out: Suggestion[] = [];
  const root = data as { suggestions?: unknown[] };
  if (!Array.isArray(root?.suggestions)) return out;

  for (const s of root.suggestions) {
    const sp = s as {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
      };
    };
    const placeId = sp.placePrediction?.placeId;
    const description = sp.placePrediction?.text?.text;
    if (placeId && description) {
      out.push({ description, placeId });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = assertEnv("SUPABASE_URL");
  const SUPABASE_ANON_KEY = assertEnv("SUPABASE_ANON_KEY");

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, error: "Not authenticated" }, 401);
  }

  let body: {
    input?: string;
    inputOffset?: number;
    regionCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const input = (body.input ?? "").trim();
  if (input.length < 2) {
    return json(
      { ok: false, error: "input must be at least 2 characters" },
      400,
    );
  }
  if (input.length > 200) {
    return json({ ok: false, error: "input too long" }, 400);
  }

  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey?.trim()) {
    console.error("GOOGLE_PLACES_API_KEY not set");
    return json(
      { ok: false, error: "Places autocomplete not configured" },
      503,
    );
  }

  const payload: Record<string, unknown> = {
    input,
    languageCode: "en",
  };

  if (
    body.regionCode &&
    typeof body.regionCode === "string" &&
    /^[a-zA-Z]{2}$/.test(body.regionCode.trim())
  ) {
    payload.includedRegionCodes = [body.regionCode.trim().toUpperCase()];
  }

  if (
    typeof body.inputOffset === "number" &&
    Number.isFinite(body.inputOffset) &&
    body.inputOffset >= 0
  ) {
    payload.inputOffset = Math.floor(body.inputOffset);
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey.trim(),
      },
      body: JSON.stringify(payload),
    },
  );

  const raw = await res.text();
  if (!res.ok) {
    console.error("Places API error", res.status, raw);
    return json({ ok: false, error: "Places request failed" }, 502);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid Places response" }, 502);
  }

  const suggestions = normalizeSuggestions(data);
  return json({ ok: true, suggestions });
});
