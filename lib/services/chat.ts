// REQ-11 + SRS 5.3: chat is enabled only after booking acceptance, and
// messages are visible only to the two participants of the session.
import { query } from "../db";
import { publishToSession } from "../pusher";

export async function getSessionForParty(sessionId: number, userId: number) {
  const rows = await query("SELECT * FROM sessions WHERE id = $1", [sessionId]);
  const s = rows[0];
  if (!s) return null;
  if (s.seeker_id !== userId && s.provider_id !== userId) return null; // participants only
  return s;
}

export async function listMessages(sessionId: number, userId: number) {
  const s = await getSessionForParty(sessionId, userId);
  if (!s) return null;
  if (s.status === "requested" || s.status === "rejected") return []; // chat not open yet
  return query(
    `SELECT m.*, u.name AS sender_name FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.session_id = $1 ORDER BY m.created_at ASC LIMIT 500`,
    [sessionId]
  );
}

export async function sendMessage(sessionId: number, userId: number, content: string) {
  const s = await getSessionForParty(sessionId, userId);
  if (!s) return { error: "Session not found.", status: 404 };
  if (s.status === "requested" || s.status === "rejected")
    return { error: "Chat opens after the provider accepts the booking (REQ-11).", status: 403 };
  if (s.status === "cancelled") return { error: "This session was cancelled.", status: 400 };
  content = content.trim();
  if (!content) return { error: "Empty message.", status: 400 };
  if (content.length > 2000) return { error: "Message too long (2000 chars max).", status: 400 };
  const rows = await query(
    "INSERT INTO messages (session_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id, created_at",
    [sessionId, userId, content]
  );
  await publishToSession(sessionId, "new-message", {
    id: Number(rows[0].id),
    sessionId,
    senderId: userId,
    content,
    createdAt: rows[0].created_at,
  });
  return { ok: true };
}
