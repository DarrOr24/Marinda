import { createClient } from "npm:@supabase/supabase-js@2";

const PRO_ENTITLEMENT_ID = "pro";

export const RELEVANT_WEBHOOK_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "TRANSFER",
]);

type SubscriptionPlan = "basic" | "pro";
type SubscriptionStatus = "active" | "canceled" | "expired";

export type SyncResponse = {
  ok: true;
  synced: boolean;
  familyIds: string[];
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: string | null;
};

export type RevenueCatWebhookEvent = {
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  type?: string | null;
  id?: string | null;
  aliases?: string[] | null;
};

export type RevenueCatWebhookPayload = {
  event?: RevenueCatWebhookEvent;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  type?: string | null;
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
  product_identifier?: string | null;
};

type RevenueCatSubscription = {
  expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
};

type RevenueCatSubscriber = {
  entitlements?: Record<string, RevenueCatEntitlement>;
  subscriptions?: Record<string, RevenueCatSubscription>;
};

type RevenueCatSubscriberResponse = {
  subscriber?: RevenueCatSubscriber;
};

type BillingSnapshot = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  productId: string | null;
  payingProfileId: string;
  expiresAt: string | null;
};

export type SyncContext = {
  eventType?: string | null;
  eventId?: string | null;
  appUserId: string;
  originalAppUserId?: string | null;
  aliases?: string[];
  requestedFamilyId?: string | null;
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function assertEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function matchesWebhookAuthorization(
  authorizationHeader: string,
  expectedSecret: string,
) {
  return authorizationHeader === expectedSecret ||
    authorizationHeader === `Bearer ${expectedSecret}`;
}

export function getWebhookEvent(body: RevenueCatWebhookPayload): RevenueCatWebhookEvent {
  return body.event ?? body;
}

export function emptySyncResponse(): SyncResponse {
  return {
    ok: true,
    synced: false,
    familyIds: [],
    plan: "basic",
    status: "expired",
    expiresAt: null,
  };
}

export function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function decodeBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

export function getJwtSubject(authorizationHeader: string): string | null {
  const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { sub?: unknown };
    return getString(payload.sub);
  } catch {
    return null;
  }
}

async function fetchRevenueCatSubscriber(
  appUserId: string,
  apiKey: string,
): Promise<RevenueCatSubscriber> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `RevenueCat subscriber lookup failed: ${response.status} ${text}`,
    );
  }

  const data = await response.json() as RevenueCatSubscriberResponse;
  return data.subscriber ?? {};
}

function getLatestSubscriptionEntry(subscriptions: Record<string, RevenueCatSubscription>) {
  return Object.entries(subscriptions)
    .map(([productId, subscription]) => ({
      productId,
      expiresAt: getString(subscription?.expires_date),
    }))
    .sort((a, b) => {
      const aTime = a.expiresAt ? Date.parse(a.expiresAt) : 0;
      const bTime = b.expiresAt ? Date.parse(b.expiresAt) : 0;
      return bTime - aTime;
    })[0] ?? null;
}

function isActiveAt(expiresAt: string | null, nowMs = Date.now()) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs > nowMs;
}

function buildBillingSnapshot(
  subscriber: RevenueCatSubscriber,
  profileId: string,
): BillingSnapshot {
  const entitlements = subscriber.entitlements ?? {};
  const subscriptions = subscriber.subscriptions ?? {};
  const proEntitlement = entitlements[PRO_ENTITLEMENT_ID];

  if (proEntitlement) {
    const productId = getString(proEntitlement.product_identifier);
    const subscription = productId ? subscriptions[productId] : null;
    const expiresAt = getString(proEntitlement.expires_date);
    const isActive = isActiveAt(expiresAt);

    if (!isActive) {
      return {
        plan: "basic",
        status: "expired",
        productId,
        payingProfileId: profileId,
        expiresAt,
      };
    }

    return {
      plan: "pro",
      status: getString(subscription?.unsubscribe_detected_at)
        ? "canceled"
        : "active",
      productId,
      payingProfileId: profileId,
      expiresAt,
    };
  }

  const latestSubscription = getLatestSubscriptionEntry(subscriptions);

  return {
    plan: "basic",
    status: "expired",
    productId: latestSubscription?.productId ?? null,
    payingProfileId: profileId,
    expiresAt: latestSubscription?.expiresAt ?? null,
  };
}

async function resolveProfileId(admin: any, authUserId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data?.id) {
    throw new Error("Could not resolve profile for billing sync.");
  }

  return data.id as string;
}

async function resolveFamilyIdsForProfile(
  admin: any,
  profileId: string,
  requestedFamilyId?: string | null,
) {
  if (requestedFamilyId) {
    const { data, error } = await admin
      .from("families")
      .select("id, billing_owner_id")
      .eq("id", requestedFamilyId)
      .single();

    if (error || !data?.id) {
      throw new Error("Family not found for billing sync.");
    }

    if (data.billing_owner_id !== profileId) {
      throw new Error("Only the current billing owner can sync this family.");
    }

    return [requestedFamilyId];
  }

  const { data: activeSubscriptions, error: subscriptionsError } = await admin
    .from("family_subscriptions")
    .select("family_id")
    .eq("paying_profile_id", profileId);

  if (subscriptionsError) {
    throw new Error(subscriptionsError.message);
  }

  const subscriptionFamilyIds = Array.from(
    new Set((activeSubscriptions ?? []).map((row: any) => row.family_id).filter(Boolean)),
  );

  if (subscriptionFamilyIds.length > 0) {
    return subscriptionFamilyIds;
  }

  const { data: ownedFamilies, error: familiesError } = await admin
    .from("families")
    .select("id")
    .eq("billing_owner_id", profileId);

  if (familiesError) {
    throw new Error(familiesError.message);
  }

  return Array.from(new Set((ownedFamilies ?? []).map((row: any) => row.id).filter(Boolean)));
}

async function upsertFamilySubscription(
  admin: any,
  familyId: string,
  snapshot: BillingSnapshot,
) {
  const payload = {
    family_id: familyId,
    plan: snapshot.plan,
    status: snapshot.status,
    product_id: snapshot.productId,
    paying_profile_id: snapshot.payingProfileId,
    expires_at: snapshot.expiresAt,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await admin
    .from("family_subscriptions")
    .select("id")
    .eq("family_id", familyId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await admin
      .from("family_subscriptions")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin
    .from("family_subscriptions")
    .insert(payload);

  if (error) throw new Error(error.message);
}

export async function syncBillingForAuthUser(
  admin: any,
  authUserId: string,
  revenueCatApiKey: string,
  requestedFamilyId?: string | null,
  context?: SyncContext,
): Promise<SyncResponse> {
  const profileId = await resolveProfileId(admin, authUserId);
  const familyIds = await resolveFamilyIdsForProfile(admin, profileId, requestedFamilyId);

  console.log("[revenuecat_billing] resolved identity", {
    eventType: context?.eventType ?? null,
    eventId: context?.eventId ?? null,
    appUserId: authUserId,
    originalAppUserId: context?.originalAppUserId ?? null,
    aliases: context?.aliases ?? [],
    profileId,
    requestedFamilyId: requestedFamilyId ?? null,
    familyIds,
  });

  if (familyIds.length === 0) {
    console.log("[revenuecat_billing] no families found", {
      eventType: context?.eventType ?? null,
      eventId: context?.eventId ?? null,
      appUserId: authUserId,
      profileId,
    });
    return emptySyncResponse();
  }

  const subscriber = await fetchRevenueCatSubscriber(authUserId, revenueCatApiKey);
  const snapshot = buildBillingSnapshot(subscriber, profileId);

  console.log("[revenuecat_billing] computed snapshot", {
    eventType: context?.eventType ?? null,
    eventId: context?.eventId ?? null,
    appUserId: authUserId,
    profileId,
    familyIds,
    plan: snapshot.plan,
    status: snapshot.status,
    productId: snapshot.productId,
    expiresAt: snapshot.expiresAt,
  });

  for (const familyId of familyIds) {
    await upsertFamilySubscription(admin, familyId, snapshot);
  }

  console.log("[revenuecat_billing] upsert complete", {
    eventType: context?.eventType ?? null,
    eventId: context?.eventId ?? null,
    appUserId: authUserId,
    familyIds,
  });

  return {
    ok: true,
    synced: true,
    familyIds,
    plan: snapshot.plan,
    status: snapshot.status,
    expiresAt: snapshot.expiresAt,
  };
}
