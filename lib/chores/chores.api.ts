import { getSupabase } from '../supabase';

export type ChoreStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

const supabase = getSupabase();

export type ProofPayload = { uri: string; kind: 'image' | 'video' } | undefined;

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
  chore: { title: string; description?: string; points: number; assigned_to?: string }
) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('chores')
    .insert({
      family_id: familyId,
      title: chore.title,
      points: chore.points,
      assignee_member_id: chore.assigned_to ?? null,
      created_by: user?.id ?? null,
      status: 'OPEN',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitChore(
  choreId: string,
  memberIds: string[],
  proof?: ProofPayload
) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'SUBMITTED',
      // keep a single main member for backwards compatibility
      done_by_member_id: memberIds[0] ?? null,
      // NEW: store all members
      done_by_member_ids: memberIds,
      done_at: new Date().toISOString(),
      proof_uri: proof?.uri ?? null,
      proof_kind: proof?.kind ?? null,
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
  fields: { title?: string; points?: number; assigned_to?: string | null }
) {
  const patch: any = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.points !== undefined) patch.points = fields.points;
  if (fields.assigned_to !== undefined) {
    patch.assignee_member_id = fields.assigned_to ?? null;
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
