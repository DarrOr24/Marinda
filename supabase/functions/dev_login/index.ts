/// <reference deno-types="https://deno.land/x/types/index.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function assertEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" });
  }

  const devSecret = Deno.env.get("DEV_LOGIN_SECRET");
  if (!devSecret) {
    return json({ ok: false, error: "Dev login is not enabled" });
  }

  let body: { secret?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" });
  }

  if (body.secret !== devSecret) {
    return json({ ok: false, error: "Invalid secret" });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return json({ ok: false, error: "email is required" });
  }

  const SUPABASE_URL = assertEnv("SUPABASE_URL");
  const SERVICE_ROLE = assertEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin
    .generateLink({
      type: "magiclink",
      email,
    });

  if (linkError) {
    return json({ ok: false, error: linkError.message });
  }

  const props = linkData as { properties?: { hashed_token?: string } };
  const hashedToken = props?.properties?.hashed_token;
  if (!hashedToken) {
    return json({ ok: false, error: "No token generated" });
  }

  const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: hashedToken,
    type: "email",
  });

  if (verifyError) {
    return json({ ok: false, error: verifyError.message });
  }

  const session =
    (verifyData as {
      session?: { access_token?: string; refresh_token?: string };
    })?.session;
  if (!session?.access_token || !session?.refresh_token) {
    return json({ ok: false, error: "No session from verification" });
  }

  return json({
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
});
