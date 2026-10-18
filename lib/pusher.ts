// Real-time chat transport (SRS 3.3: Pusher Channels).
// If the Pusher env vars are not set, this becomes a no-op and the chat UI
// falls back to 3-second polling, so the app works without a Pusher account.

import Pusher from "pusher";

let client: Pusher | null = null;

export function getPusher(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;
  if (!client) {
    client = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return client;
}

export function pusherConfigured(): boolean {
  return getPusher() !== null;
}

export async function publishToSession(sessionId: number, event: string, data: unknown) {
  const p = getPusher();
  if (p) await p.trigger(`private-session-${sessionId}`, event, data as any);
}
