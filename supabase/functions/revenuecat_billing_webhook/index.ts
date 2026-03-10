import {
  assertEnv,
  createAdminClient,
  emptySyncResponse,
  getString,
  getWebhookEvent,
  json,
  matchesWebhookAuthorization,
  RELEVANT_WEBHOOK_EVENTS,
  syncBillingForAuthUser,
  type RevenueCatWebhookPayload,
} from "../_shared/revenuecat-billing.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = assertEnv("SUPABASE_URL");
  const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const revenueCatApiKey = assertEnv("REVENUECAT_SECRET_API_KEY");
  const webhookSecret = assertEnv("REVENUECAT_WEBHOOK_AUTH");

  const authorizationHeader = req.headers.get("Authorization") ?? "";
  if (!matchesWebhookAuthorization(authorizationHeader, webhookSecret)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let body: RevenueCatWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const event = getWebhookEvent(body);
  const eventType = getString(event.type);

  if (eventType && !RELEVANT_WEBHOOK_EVENTS.has(eventType)) {
    return json(emptySyncResponse());
  }

  const authUserId = getString(event.app_user_id) ??
    getString(event.original_app_user_id);
  if (!authUserId) {
    return json(emptySyncResponse());
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  try {
    return json(
      await syncBillingForAuthUser(admin, authUserId, revenueCatApiKey, undefined, {
        eventType,
        eventId: getString(event.id),
        appUserId: authUserId,
        originalAppUserId: getString(event.original_app_user_id),
        aliases: Array.isArray(event.aliases)
          ? event.aliases.filter((value): value is string => typeof value === "string")
          : [],
      }),
    );
  } catch (error) {
    console.error("[revenuecat_billing_webhook] failed", error);
    return json(
      { ok: false, error: (error as Error)?.message ?? "Billing sync failed" },
      500,
    );
  }
});
