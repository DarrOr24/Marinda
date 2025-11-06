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

export async function updateChoreStatus(choreId: string, status: ChoreStatus) {
  const { data, error } = await supabase
    .from('chores')
    .update({ status })
    .eq('id', choreId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
