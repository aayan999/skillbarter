// REQ-16: dispute reporting (no-show, poor quality, other).
// REQ-19 (admin resolve / reverse / warn) lives in lib/services/admin.ts.
import { query } from "../db";
import { notify } from "./notifications";

const REASONS = ["no_show", "poor_quality", "credit_issue", "other"];

export async function createDispute(
  sessionId: number,
  reporterId: number,
  reason: string,
  description: string
) {
  const s = (await query("SELECT * FROM sessions WHERE id = $1", [sessionId]))[0];
  if (!s || (s.seeker_id !== reporterId && s.provider_id !== reporterId))
    return { error: "Session not found.", status: 404 };
  if (s.status !== "accepted" && s.status !== "completed")
    return { error: "Disputes can be reported for accepted or completed sessions.", status: 400 };
  if (!REASONS.includes(reason)) return { error: "Unknown reason.", status: 400 };
  const rows = await query(
    "INSERT INTO disputes (session_id, reporter_id, reason, description) VALUES ($1,$2,$3,$4) RETURNING id",
    [sessionId, reporterId, reason, description.trim()]
  );
  const admins = await query("SELECT id FROM users WHERE is_admin = TRUE");
  for (const a of admins) {
    await notify(
      Number(a.id),
      "dispute_reported",
      `New dispute (${reason}) on session #${sessionId}.`,
      `/admin`
    );
  }
  return { ok: true, id: Number(rows[0].id) };
}

export async function listUserDisputes(userId: number) {
  return query(
    `SELECT d.*, su.name AS reporter_name FROM disputes d
     JOIN users su ON su.id = d.reporter_id
     WHERE d.reporter_id = $1 ORDER BY d.created_at DESC`,
    [userId]
  );
}

// REQ-15 (reminders): accepted sessions starting within 24h -> one reminder each.
export async function createSessionReminders(userId: number) {
  const rows = await query(
    `SELECT s.id, COALESCE(o.skill_name, r.skill_needed) AS skill_label, s.scheduled_at
     FROM sessions s
     LEFT JOIN skill_offers o ON o.id = s.offer_id
     LEFT JOIN skill_requests r ON r.id = s.request_id
     WHERE (s.seeker_id = $1 OR s.provider_id = $1)
       AND s.status = 'accepted'
       AND s.scheduled_at BETWEEN now() AND now() + interval '24 hours'`,
    [userId]
  );
  for (const s of rows) {
    await notify(
      userId,
      "session_reminder",
      `Reminder: "${s.skill_label}" starts ${new Date(s.scheduled_at).toLocaleString()}.`,
      `/sessions/${s.id}`,
      `reminder-${s.id}-${new Date(s.scheduled_at).toDateString()}`
    );
  }
}
