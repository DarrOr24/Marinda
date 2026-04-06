/// <reference deno-types="https://deno.land/x/types/index.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2";

import { assertEnv, json } from "../_shared/http.ts";
import {
  createExpoPushMessage,
  sendPushNotificationsToMembers,
} from "../_shared/push.ts";

type Role = "MOM" | "DAD" | "ADULT" | "TEEN" | "CHILD";

type Body = {
  choreId?: string;
  familyId?: string;
};

type CreatorRow = {
  id: string;
  family_id: string;
  role: Role;
  nickname: string | null;
  profile:
    | {
      auth_user_id: string | null;
      first_name: string | null;
    }
    | {
      auth_user_id: string | null;
      first_name: string | null;
    }[]
    | null;
};

type ChoreRow = {
  id: string;
  title: string | null;
  family_id: string;
  created_by_member_id: string | null;
  assignee_member_ids: string[] | null;
};

function getProfile(row: CreatorRow) {
  if (!row.profile) return null;
  return Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile;
}

function getCreatorName(row: CreatorRow) {
  const nickname = row.nickname?.trim();
  if (nickname) return nickname;

  const firstName = getProfile(row)?.first_name?.trim();
  if (firstName) return firstName;

  return "A parent";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = assertEnv("SUPABASE_URL");
    const supabaseAnonKey = assertEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const choreId = (body.choreId ?? "").trim();
    const requestedFamilyId = (body.familyId ?? "").trim() || null;

    if (!choreId) {
      return json({ ok: false, error: "choreId is required" }, 400);
    }

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ ok: false, error: "Not authenticated" }, 401);
    }

    const authUserId = userData.user.id;

    const { data: chore, error: choreError } = await admin
      .from("chores")
      .select("id, title, family_id, created_by_member_id, assignee_member_ids")
      .eq("id", choreId)
      .single<ChoreRow>();

    if (choreError || !chore) {
      return json({ ok: false, error: "Chore not found" }, 404);
    }

    if (requestedFamilyId && requestedFamilyId !== chore.family_id) {
      return json({ ok: false, error: "Family mismatch" }, 400);
    }

    if (!chore.created_by_member_id) {
      return json({ ok: true, skipped: true, reason: "missing_creator_member" });
    }

    const { data: creator, error: creatorError } = await admin
      .from("family_members")
      .select(`
        id,
        family_id,
        role,
        nickname,
        profile:profiles (
          auth_user_id,
          first_name
        )
      `)
      .eq("id", chore.created_by_member_id)
      .eq("is_active", true)
      .single<CreatorRow>();

    if (creatorError || !creator) {
      return json({ ok: false, error: "Creator member not found" }, 404);
    }

    const creatorProfile = getProfile(creator);

    if (creator.family_id !== chore.family_id || creatorProfile?.auth_user_id !== authUserId) {
      return json({ ok: false, error: "Not allowed to notify for this chore" }, 403);
    }

    if (creator.role !== "MOM" && creator.role !== "DAD") {
      return json({ ok: true, skipped: true, reason: "creator_is_not_parent" });
    }

    const relevantMemberIds = [...new Set(
      (chore.assignee_member_ids ?? [])
        .map((memberId) => memberId?.trim())
        .filter((memberId): memberId is string => Boolean(memberId) && memberId !== creator.id),
    )];

    if (relevantMemberIds.length === 0) {
      return json({ ok: true, skipped: true, reason: "no_relevant_recipients" });
    }

    const { data: recipientMembers, error: memberError } = await admin
      .from("family_members")
      .select("id")
      .eq("family_id", chore.family_id)
      .eq("is_active", true)
      .in("id", relevantMemberIds);

    if (memberError) {
      throw new Error(memberError.message);
    }

    const recipientMemberIds = (recipientMembers ?? [])
      .map((member) => member.id as string)
      .filter(Boolean);

    if (recipientMemberIds.length === 0) {
      return json({ ok: true, recipients: 0 });
    }

    const creatorName = getCreatorName(creator);
    const choreTitle = chore.title?.trim() || "A new chore";
    const { tokens, tickets } = await sendPushNotificationsToMembers({
      admin,
      recipientMemberIds,
      buildMessage: (token) =>
        createExpoPushMessage({
          to: token,
          title: "New chore added",
          body: `${creatorName} added "${choreTitle}".`,
          data: {
            type: "chore_created",
            familyId: chore.family_id,
            choreId: chore.id,
          },
        }),
    });

    if (tokens.length === 0) {
      return json({ ok: true, recipients: 0 });
    }

    const failedTickets = tickets.filter((ticket) => ticket.status === "error");
    if (failedTickets.length > 0) {
      console.warn("[notify_chore_created] expo ticket errors", {
        choreId,
        errors: failedTickets,
      });
    }

    return json({
      ok: true,
      recipients: tokens.length,
    });
  } catch (error) {
    console.error("[notify_chore_created] failed", error);
    return json(
      {
        ok: false,
        error: (error as Error)?.message ?? "Failed to send chore notifications",
      },
      500,
    );
  }
});
