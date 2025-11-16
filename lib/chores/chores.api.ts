import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { getSupabase } from '../supabase';

export type ChoreStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

const supabase = getSupabase();
const PROOFS_BUCKET = 'chore-proofs';
const AUDIO_BUCKET = 'chore-audio'; // 🔹 AUDIO: new bucket const

export type ProofPayload = { uri: string; kind: 'image' | 'video' } | undefined;

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
  proof: ProofPayload
): Promise<{ publicUrl: string | null }> {
  if (!proof) return { publicUrl: null };

  // Decide file extension + mime type
  const ext = proof.kind === 'video' ? 'mp4' : 'jpg';
  const mime = proof.kind === 'video' ? 'video/mp4' : 'image/jpeg';

  // Example path: choreId/memberId/timestamp.jpg
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${choreId}/${uploaderMemberId ?? 'unknown'}/${fileName}`;

  // 🔹 1) Read the local file into base64 (Expo way)
  const base64 = await FileSystem.readAsStringAsync(proof.uri, {
    encoding: 'base64',
  } as any);

  // 🔹 2) Convert base64 → raw bytes (ArrayBuffer)
  const fileData = decode(base64); // this is what Supabase actually wants

  // 🔹 3) Upload bytes to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(PROOFS_BUCKET)
    .upload(filePath, fileData, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // 🔹 4) Get a public URL for all devices to use
  const { data: publicData } = supabase.storage
    .from(PROOFS_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl ?? null;

  // 🔹 5) Save metadata row in chore_proofs table
  const { error: insertError } = await supabase.from('chore_proofs').insert({
    chore_id: choreId,
    uploader_member_id: uploaderMemberId, // <- must match family_members.id FK
    storage_path: filePath,
    media_type: proof.kind, // 'image' | 'video'
    note: null,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { publicUrl };
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
  const { data, error } = await supabase
    .from('chores')
    .select('*') // proof_* + assignee + done_by_* come back
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function addChore(
  familyId: string,
  chore: {
    title: string;
    description?: string;
    points: number;
    assigned_to?: string;
    // 🔹 AUDIO: optional audio fields when creating a chore
    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null;
  }
) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('chores')
    .insert({
      family_id: familyId,
      title: chore.title,
      description: chore.description ?? null, // 👈 already added text description
      points: chore.points,
      assignee_member_id: chore.assigned_to ?? null,
      created_by: user?.id ?? null,
      status: 'OPEN',
      // 🔹 AUDIO: map to DB columns
      audio_description_url: chore.audioDescriptionUrl ?? null,
      audio_description_duration: chore.audioDescriptionDuration ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitChore(
  choreId: string,
  memberIds: string[],
  proof?: ProofPayload,
  proofNote?: string        // 🔹 NEW
) {
  let proofUri: string | null = null;
  let proofKind: 'image' | 'video' | null = null;

  if (proof) {
    const mainMemberId = memberIds[0] ?? null;
    const { publicUrl } = await uploadProofForChore(
      choreId,
      mainMemberId,
      proof
    );
    proofUri = publicUrl;
    proofKind = proof.kind;
  }

  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'SUBMITTED',
      done_by_member_id: memberIds[0] ?? null,
      done_by_member_ids: memberIds,
      done_at: new Date().toISOString(),
      proof_uri: proofUri,
      proof_kind: proofKind,
      proof_note: proofNote ?? null,   // 🔹 NEW
    })
    .eq('id', choreId)
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
      done_by_member_id: null,
      done_at: null,
      approved_by_member_id: null,
      approved_at: null,
      // clear proof on reject
      proof_uri: null,
      proof_kind: null,
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
    .select('family_id, title, points, assignee_member_id')
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
      assignee_member_id: src.assignee_member_id ?? null,
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
    description?: string | null; // 👈 text description already here
    points?: number;
    assigned_to?: string | null;
    // 🔹 AUDIO: allow editing audio description fields
    audioDescriptionUrl?: string | null;
    audioDescriptionDuration?: number | null;
  }
) {
  const patch: any = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.description !== undefined)
    patch.description = fields.description ?? null;
  if (fields.points !== undefined) patch.points = fields.points;
  if (fields.assigned_to !== undefined) {
    patch.assignee_member_id = fields.assigned_to ?? null;
  }
  if (fields.audioDescriptionUrl !== undefined) {
    patch.audio_description_url = fields.audioDescriptionUrl;
  }
  if (fields.audioDescriptionDuration !== undefined) {
    patch.audio_description_duration = fields.audioDescriptionDuration;
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
