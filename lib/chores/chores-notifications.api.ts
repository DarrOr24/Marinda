import { invokeAuthenticatedFunction } from '@/lib/supabase'

type NotifyChoreCreatedParams = {
  choreId: string
  familyId: string
}

type NotifyChoreCreatedResult = {
  ok: boolean
  skipped?: boolean
  recipients?: number
}

export async function notifyChoreCreated({
  choreId,
  familyId,
}: NotifyChoreCreatedParams): Promise<NotifyChoreCreatedResult> {
  return invokeAuthenticatedFunction<NotifyChoreCreatedResult>({
    functionName: 'notify_chore_created',
    body: {
      choreId,
      familyId,
    },
    errorMessage: 'Could not send chore notifications right now.',
  })
}
