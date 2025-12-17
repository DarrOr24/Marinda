import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase } from '../supabase';
import type { ProofPayload } from './chores.types';

export type ChoreStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

const supabase = getSupabase();
const PROOFS_BUCKET = 'chore-proofs';
const AUDIO_BUCKET = 'chore-audio'; // 🔹 AUDIO: new bucket const

// 🔹 AUDIO: payload type for an audio description
export type AudioDescriptionPayload =
  | {
    uri: string; // local file URI from Expo AV
    durationSeconds: number; // we’ll store this in audio_description_duration
  }
  | undefined;

async function uploadProofForChore(
  choreId: string,
  uploaderMemberId: string | null,
  proof: { uri: string; kind: "image" | "video" },
  type: "BEFORE" | "AFTER"
): Promise<string | null> {

  const ext = proof.kind === "video" ? "mp4" : "jpg";
  const mime = proof.kind === "video" ? "video/mp4" : "image/jpeg";
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${choreId}/${uploaderMemberId ?? "unknown"}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(proof.uri, {
    encoding: "base64",
  } as any);
  const fileData = decode(base64);

  const { error: uploadErr } = await supabase.storage
    .from(PROOFS_BUCKET)
    .upload(filePath, fileData, {
      contentType: mime,
      upsert: false,
    });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data } = supabase.storage
    .from(PROOFS_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = data?.publicUrl ?? null;

  await supabase.from("chore_proofs").insert({
    chore_id: choreId,
    uploader_member_id: uploaderMemberId,
    storage_path: filePath,
    media_type: proof.kind,
    type,         // ⭐ NEW
    note: null,
  });

  return publicUrl;
}

// 🔹 AUDIO: upload helper for audio descriptions
export async function uploadChoreAudioDescription(
  familyId: string,
  uploaderMemberId: string | null,
  audio: AudioDescriptionPayload
): Promise<{ publicUrl: string | null }> {
  if (!audio) return { publicUrl: null };

  const ext = 'm4a'; // Expo AV default for recorded audio
  const mime = 'audio/m4a';

  const fileName = `${Date.now()}.${ext}`;
  // path: familyId/memberId/timestamp.m4a
  const filePath = `${familyId}/${uploaderMemberId ?? 'unknown'}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(audio.uri, {
    encoding: 'base64',
  } as any);
  const fileData = decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(filePath, fileData, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl ?? null;

  return { publicUrl };
}

export async function fetchChores(familyId: string) {
  // Load chores
  const { data: chores, error } = await supabase
    .from("chores")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Load proofs (no family_id filter!)
  const { data: proofs, error: proofsErr } = await supabase
    .from("chore_proofs")
    .select("*");

  if (proofsErr) throw new Error(proofsErr.message);

  // Group proofs by chore_id
  const proofsByChore: Record<
    string,
    { uri: string; kind: "image" | "video"; type: "BEFORE" | "AFTER" }[]
  > = {};

  proofs.forEach((p: any) => {
    const { data: urlData } = supabase
      .storage
      .from("chore-proofs")
      .getPublicUrl(p.storage_path);

    const url = urlData?.publicUrl ?? null;
    if (!url) return;

    if (!proofsByChore[p.chore_id]) proofsByChore[p.chore_id] = [];

    proofsByChore[p.chore_id].push({
      uri: url,
      kind: p.media_type,
      type: p.type,
    });
  });

  // Merge into chores
  return (chores ?? []).map((c: any) => ({
    ...c,
    proofs: proofsByChore[c.id] ?? [],
  }));
}

export async function addChore(
  familyId: string,
  chore: {
    title: string;
    description?: string;
    points: number;
    assigned_to?: string;
    assigned_to_ids?: string[];
    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null;
    expiresAt?: string | null;
  }
) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('chores')
    .insert({
      family_id: familyId,
      title: chore.title,
      description: chore.description ?? null,
      points: chore.points,
      assignee_member_ids: chore.assigned_to_ids ?? [],
      created_by: user?.id ?? null,
      status: 'OPEN',

      audio_description_url: chore.audioDescriptionUrl ?? null,
      audio_description_duration: chore.audioDescriptionDuration ?? null,

      expires_at: chore.expiresAt ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitChore(
  choreId: string,
  memberIds: string[],
  proofs: ProofPayload,
  proofNote?: string
) {
  const main = memberIds[0] ?? null;

  // BEFORE
  if (proofs.before) {
    await uploadProofForChore(
      choreId,
      main,
      proofs.before,
      "BEFORE"
    );
  }

  // AFTER (required)
  if (proofs.after) {
    await uploadProofForChore(
      choreId,
      main,
      proofs.after,
      "AFTER"
    );
  }

  const { data, error } = await supabase
    .from("chores")
    .update({
      status: "SUBMITTED",
      done_by_member_ids: memberIds,
      done_at: new Date().toISOString(),
      proof_note: proofNote ?? null,
    })
    .eq("id", choreId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}


export async function approveChore(
  choreId: string,
  parentMemberId: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'APPROVED',
      approved_by_member_id: parentMemberId,
      approved_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', choreId)
    .select('*, done_by_member_ids')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function rejectChore(choreId: string, notes?: string) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'OPEN',
      notes: notes ?? null,
      done_by_member_ids: [],
      done_at: null,
      approved_by_member_id: null,
      approved_at: null,
      proof_note: null,
    })
    .eq('id', choreId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteChore(choreId: string) {
  const { error } = await supabase.from('chores').delete().eq('id', choreId);
  if (error) throw new Error(error.message);
  return true;
}

export async function duplicateChore(choreId: string) {
  // get source row (only fields we want to copy)
  const { data: src, error: selErr } = await supabase
    .from('chores')
    .select('family_id, title, points, assignee_member_id, assignee_member_ids')
    .eq('id', choreId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const user = (await supabase.auth.getUser()).data.user;

  const { data: inserted, error: insErr } = await supabase
    .from('chores')
    .insert({
      family_id: src.family_id,
      title: src.title,
      points: src.points,
      assignee_member_ids: src.assignee_member_ids ?? [],
      status: 'OPEN',
      created_by: user?.id ?? null,
      // proof_* intentionally not copied; new chore starts fresh
    })
    .select()
    .single();

  if (insErr) throw new Error(insErr.message);
  return inserted;
}

export async function updateChore(
  choreId: string,
  fields: {
    title?: string;
    description?: string | null;
    points?: number;
    assigned_to_ids?: string[] | null;

    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null;

    expiresAt?: string | null;
  }
) {
  const patch: any = {};

  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.description !== undefined)
    patch.description = fields.description ?? null;
  if (fields.points !== undefined) patch.points = fields.points;

  if (fields.assigned_to_ids !== undefined) {
    patch.assignee_member_ids = fields.assigned_to_ids ?? [];
  }

  if (fields.audioDescriptionUrl !== undefined) {
    patch.audio_description_url = fields.audioDescriptionUrl;
  }
  if (fields.audioDescriptionDuration !== undefined) {
    patch.audio_description_duration = fields.audioDescriptionDuration;
  }
  if (fields.expiresAt !== undefined) {
    patch.expires_at = fields.expiresAt;
  }

  const { data, error } = await supabase
    .from('chores')
    .update(patch)
    .eq('id', choreId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}


// NEW: log a points event into points_ledger for an approved chore
export async function logChorePointsEvent(params: {
  familyId: string;
  memberId: string;
  choreId: string;
  delta: number;
  approverMemberId: string;
  reason?: string | null;
}) {
  const { familyId, memberId, choreId, delta, approverMemberId, reason } = params;

  const { error } = await supabase.from('points_ledger').insert({
    family_id: familyId,
    member_id: memberId,
    delta,
    reason: reason ?? null,
    chore_id: choreId,
    approved_by_member_id: approverMemberId,
    kind: 'chore_earn', // 👈 uses your new column
  });

  if (error) {
    throw new Error(error.message);
  }
}
