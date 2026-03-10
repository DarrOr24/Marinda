import {
  assertEnv,
  createAdminClient,
  getJwtSubject,
  getString,
  json,
  syncBillingForAuthUser,
} from "../_shared/revenuecat-billing.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = assertEnv("SUPABASE_URL");
  const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const revenueCatApiKey = assertEnv("REVENUECAT_SECRET_API_KEY");

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);
  const authorizationHeader = req.headers.get("Authorization") ?? "";
  const authUserId = getJwtSubject(authorizationHeader);

  if (!authUserId) {
    return json({ ok: false, error: "Not authenticated" }, 401);
  }

  let body: { familyId?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  try {
    return json(
      await syncBillingForAuthUser(
        admin,
        authUserId,
        revenueCatApiKey,
        getString(body.familyId),
        {
          appUserId: authUserId,
          requestedFamilyId: getString(body.familyId),
        },
      ),
    );
  } catch (error) {
    console.error("[revenuecat_billing_sync] failed", error);
    return json(
      { ok: false, error: (error as Error)?.message ?? "Billing sync failed" },
      500,
    );
  }
});
