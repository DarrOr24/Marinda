import { getSupabase } from '../supabase'


export type ChoreStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

const supabase = getSupabase()

export async function fetchChores(familyId: string) {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function addChore(
  familyId: string,
  chore: { title: string; description?: string; points: number; assigned_to?: string }
) {
  const user = (await supabase.auth.getUser()).data.user
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
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function submitChore(choreId: string, memberId: string) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'SUBMITTED',
      done_by_member_id: memberId,
      done_at: new Date().toISOString(),
    })
    .eq('id', choreId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function approveChore(choreId: string, parentMemberId: string, notes?: string) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'APPROVED',
      approved_by_member_id: parentMemberId,
      approved_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', choreId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function rejectChore(choreId: string, notes?: string) {
  // bounce back to OPEN and clear submit fields
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'OPEN',
      notes: notes ?? null,
      done_by_member_id: null,
      done_at: null,
      approved_by_member_id: null,
      approved_at: null,
    })
    .eq('id', choreId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

