/// <reference deno-types="https://deno.land/x/types/index.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2";

type Role = "MOM" | "DAD" | "ADULT" | "TEEN" | "CHILD";

type Body = {
  familyId: string;
  invited_phone: string;
  role: Role;
};

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

function normalizePhone(phone: string) {
  return phone.trim();
}

function randomToken(len = 32) {
  // URL-safe token
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sendTwilioSms(to: string, body: string) {
  const sid = assertEnv("TWILIO_ACCOUNT_SID");
  const token = assertEnv("TWILIO_AUTH_TOKEN");
  const from = assertEnv("TWILIO_FROM_PHONE");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", from);
  params.set("Body", body);

  const basic = btoa(`${sid}:${token}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio SMS failed: ${res.status} ${text}`);
  }
}

async function safeRevokeInvite(
  admin: ReturnType<typeof createClient>,
  inviteId: string,
) {
  try {
    await admin
      .from("family_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);
  } catch {
    // ignore best-effort cleanup
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" });
  }

  const SUPABASE_URL = assertEnv("SUPABASE_URL");
  const SUPABASE_ANON_KEY = assertEnv("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const INVITE_LINK_BASE = assertEnv("INVITE_LINK_BASE");

  const authHeader = req.headers.get("Authorization") ?? "";

  // 1) user client (verifies caller session)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) admin client (service role)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" });
  }

  const familyId = (body.familyId ?? "").trim();
  const invited_phone = normalizePhone(body.invited_phone ?? "");
  const role = body.role;

  if (!familyId) return json({ ok: false, error: "familyId is required" });
  if (!invited_phone) {
    return json({ ok: false, error: "invited_phone is required" });
  }

  const allowedRoles: Role[] = ["MOM", "DAD", "ADULT", "TEEN", "CHILD"];
  if (!allowedRoles.includes(role)) {
    return json({ ok: false, error: "Invalid role" });
  }

  // 3) identify caller (must be authenticated)
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, error: "Not authenticated" });
  }
  const authUserId = userData.user.id;

  // 4) resolve caller profile
  const { data: callerProfile, error: profErr } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (profErr || !callerProfile?.id) {
    return json({ ok: false, error: "Could not resolve caller profile" });
  }
  const callerProfileId = callerProfile.id as string;

  // 5) verify caller is parent in the family
  const { data: callerMember, error: memErr } = await admin
    .from("family_members")
    .select("id, role")
    .eq("family_id", familyId)
    .eq("profile_id", callerProfileId)
    .eq("is_active", true)
    .single();

  if (memErr || !callerMember) {
    return json({ ok: false, error: "Not a member of this family" });
  }

  const callerRole = callerMember.role as Role;
  const isParent = callerRole === "MOM" || callerRole === "DAD";
  if (!isParent) {
    return json({ ok: false, error: "Only parents can invite members" });
  }

  // 6) prevent duplicate pending invite for same phone (matches your partial unique index)
  {
    const { data: existingInvite, error } = await admin
      .from("family_invites")
      .select("id")
      .eq("family_id", familyId)
      .eq("invited_phone", invited_phone)
      .eq("status", "pending")
      .maybeSingle();

    if (error) {
      return json({
        ok: false,
        error: "Failed checking existing invites",
      });
    }

    if (existingInvite?.id) {
      return json({
        ok: false,
        error: "An invite for this phone is already pending",
      });
    }
  }

  // 7) check if this phone already belongs to an active member of the family
  // We only look at auth users who are already members of THIS family (bounded by family size).
  const { data: familyRows, error: famErr } = await admin
    .from("family_members")
    .select(
      `
      profile:profiles (
        auth_user_id
      )
    `,
    )
    .eq("family_id", familyId)
    .eq("is_active", true);

  if (famErr) {
    return json({
      ok: false,
      error: "Failed to check existing family members",
    });
  }

  const authUserIds = (familyRows ?? []).flatMap((row: any) => {
    const p = row.profile;
    if (!p) return [];
    if (Array.isArray(p)) {
      return p.map((x) => x?.auth_user_id).filter(Boolean);
    }
    return p.auth_user_id ? [p.auth_user_id] : [];
  });

  for (const uid of authUserIds) {
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (error) continue; // best-effort; don't block invites if a lookup fails

    const memberPhone = data.user?.phone ?? "";
    if (memberPhone && memberPhone === invited_phone) {
      return json({
        ok: false,
        error: "This phone number already belongs to a family member",
        alreadyMember: true,
      });
    }
  }

  // 8) create invite row
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const { data: inviteRow, error: invErr } = await admin
    .from("family_invites")
    .insert({
      family_id: familyId,
      invited_phone,
      role,
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      invited_by_profile_id: callerProfileId,
    })
    .select("id, token, expires_at")
    .single();

  if (invErr || !inviteRow) {
    // Race-safe: rely on partial unique index (family_id, invited_phone) WHERE status='pending'
    const code = invErr?.code;
    if (code === "23505") {
      return json({
        ok: false,
        error: "An invite for this phone is already pending",
      });
    }

    return json({
      ok: false,
      error: invErr?.message ?? "Could not create invite",
    });
  }

  // 9) send SMS (if it fails, revoke invite so the “pending invite” index won't block retries)
  const link = `${INVITE_LINK_BASE}?token=${encodeURIComponent(token)}`;
  const smsBody = `You were invited to join a family on Marinda.\n` +
    `Open: ${link}\n\n` +
    `If you didn't expect this, ignore this message.`;

  try {
    await sendTwilioSms(invited_phone, smsBody);
  } catch (e) {
    await safeRevokeInvite(admin, inviteRow.id);
    return json({
      ok: false,
      error: (e as Error)?.message ?? "SMS send failed",
    });
  }

  return json({
    ok: true,
    inviteId: inviteRow.id,
    expiresAt: inviteRow.expires_at,
  });
});
