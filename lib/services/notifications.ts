// REQ-15: basic notifications (booking status updates, session reminders).
import { query } from "../db";

export async function notify(
  userId: number,
  type: string,
  message: string,
  link = "",
  dedupeKey?: string
) {
  await query(
    `INSERT INTO notifications (user_id, type, message, link, dedupe_key)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
    [userId, type, message, link, dedupeKey ?? null]
  );
}

export async function getNotifications(userId: number) {
  return query(
    "SELECT id, type, message, link, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId]
  );
}

export async function markAllRead(userId: number) {
  await query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [userId]);
}
