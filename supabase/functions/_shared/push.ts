const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = "default";

type PushTokenRow = {
  expo_push_token: string | null;
};

export type ExpoPushTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: unknown;
};

type ExpoPushSendResponse = {
  data?: ExpoPushTicket[];
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: string;
  channelId?: string;
  data?: Record<string, unknown>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function createExpoPushMessage(message: ExpoPushMessage): ExpoPushMessage {
  return {
    sound: "default",
    channelId: DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID,
    ...message,
  };
}

export async function fetchActiveExpoPushTokens(admin: any, memberIds: string[]) {
  if (memberIds.length === 0) return [];

  const { data, error } = await admin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("is_active", true)
    .in("member_id", memberIds);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PushTokenRow[];

  return [...new Set(
    rows
      .map((row) => row.expo_push_token?.trim())
      .filter((token): token is string => Boolean(token)),
  )];
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  const tickets: ExpoPushTicket[] = [];

  for (const messageChunk of chunk(messages, 100)) {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messageChunk),
    });

    const payload = await response.text();
    if (!response.ok) {
      throw new Error(`Expo push send failed: ${response.status} ${payload}`);
    }

    let parsedPayload: ExpoPushSendResponse;

    try {
      parsedPayload = JSON.parse(payload) as ExpoPushSendResponse;
    } catch {
      throw new Error("Expo push send returned invalid JSON.");
    }

    tickets.push(...(parsedPayload.data ?? []));
  }

  return tickets;
}

export async function sendPushNotificationsToMembers({
  admin,
  recipientMemberIds,
  buildMessage,
}: {
  admin: any;
  recipientMemberIds: string[];
  buildMessage: (token: string) => ExpoPushMessage;
}) {
  const tokens = await fetchActiveExpoPushTokens(admin, recipientMemberIds);
  if (tokens.length === 0) {
    return {
      tokens: [],
      tickets: [],
    };
  }

  const tickets = await sendExpoPushMessages(tokens.map(buildMessage));

  return {
    tokens,
    tickets,
  };
}
