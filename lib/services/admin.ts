// REQ-18 + REQ-19: admin dashboard data and dispute resolution.
// The Admin class (Figure B.2): viewDashboard, reviewDispute, reverseCredits, warnUser.
import { query } from "../db";
import { adminReverseCredits } from "./wallet";
import { notify } from "./notifications";

export async function adminOverview() {
  const [users] = await query("SELECT COUNT(*) AS c FROM users");
  const [sessions] = await query("SELECT COUNT(*) AS c FROM sessions");
  const [open] = await query("SELECT COUNT(*) AS c FROM disputes WHERE status = 'open'");
  const [credits] = await query(
    "SELECT COALESCE(SUM(amount), 0) AS c FROM credit_transactions WHERE amount > 0 AND type IN ('earn','registration_bonus')"
  );
  const byStatus = await query("SELECT status, COUNT(*) AS c FROM sessions GROUP BY status");
  return {
    users: Number(users.c),
    sessions: Number(sessions.c),
    openDisputes: Number(open.c),
    creditsIssued: Number(credits.c),
    sessionsByStatus: Object.fromEntries(byStatus.map((r: any) => [r.status, Number(r.c)])),
  };
}

export async function adminListUsers() {
  return query(
    `SELECT u.id, u.name, u.email, u.college_id, u.credits, u.avg_rating, u.warnings, u.is_admin, u.created_at,
            (SELECT COUNT(*) FROM sessions s WHERE s.seeker_id = u.id OR s.provider_id = u.id) AS session_count
     FROM users u ORDER BY u.created_at DESC`
  );
}

export async function adminListSessions() {
  return query(
    `SELECT s.*, su.name AS seeker_name, pu.name AS provider_name,
            COALESCE(o.skill_name, r.skill_needed) AS skill_label
     FROM sessions s
     JOIN users su ON su.id = s.seeker_id
     JOIN users pu ON pu.id = s.provider_id
     LEFT JOIN skill_offers o ON o.id = s.offer_id
     LEFT JOIN skill_requests r ON r.id = s.request_id
     ORDER BY s.created_at DESC LIMIT 100`
  );
}

export async function adminListDisputes() {
  return query(
    `SELECT d.*, u.name AS reporter_name, s.seeker_id, s.provider_id, s.credits AS session_credits,
            su.name AS seeker_name, pu.name AS provider_name
     FROM disputes d
     JOIN users u ON u.id = d.reporter_id
     JOIN sessions s ON s.id = d.session_id
     JOIN users su ON su.id = s.seeker_id
     JOIN users pu ON pu.id = s.provider_id
     ORDER BY d.status = 'resolved', d.created_at DESC`
  );
}

// REQ-19: reverse the credits or warn the user involved.
export async function resolveDispute(
  disputeId: number,
  adminId: number,
  action: "reverse_credits" | "warn_user" | "dismiss",
  notes: string,
  warnedUserId?: number
) {
  const d = (await query("SELECT * FROM disputes WHERE id = $1", [disputeId]))[0];
  if (!d) return { error: "Dispute not found.", status: 404 };
  if (d.status === "resolved") return { error: "Already resolved.", status: 400 };
  const s = (await query("SELECT * FROM sessions WHERE id = $1", [d.session_id]))[0];
  let resolution = action;
  let finalNotes = notes.trim();

  if (action === "reverse_credits") {
    if (s.status !== "completed")
      return { error: "Credits can be reversed only for completed sessions (otherwise cancel releases them).", status: 400 };
    const moved = await adminReverseCredits(s.provider_id, s.seeker_id, s.id, Number(s.credits));
    finalNotes = `${finalNotes} [reversed ${moved}/${s.credits} credits provider -> seeker]`.trim();
    if (moved < Number(s.credits))
      finalNotes += " (partial: provider had already spent part of the credits; balances never go negative, REQ-8)";
    await notify(s.seeker_id, "dispute_resolved", `Dispute on session #${s.id}: ${moved} credit(s) returned to you.`, `/sessions/${s.id}`);
    await notify(s.provider_id, "dispute_resolved", `Dispute on session #${s.id}: admin reversed ${moved} credit(s).`, `/sessions/${s.id}`);
  } else if (action === "warn_user") {
    const target = warnedUserId && [s.seeker_id, s.provider_id].includes(warnedUserId)
      ? warnedUserId
      : s.seeker_id === d.reporter_id
        ? s.provider_id
        : s.seeker_id; // default: the reported party
    await query("UPDATE users SET warnings = warnings + 1 WHERE id = $1", [target]);
    await notify(target, "admin_warning", `Admin warning regarding session #${s.id}: ${finalNotes || "please follow platform rules."}`, `/sessions/${s.id}`);
    await notify(d.reporter_id, "dispute_resolved", `Your dispute on session #${s.id} was reviewed; the user was warned.`, `/sessions/${s.id}`);
  } else {
    await notify(d.reporter_id, "dispute_resolved", `Your dispute on session #${s.id} was reviewed and dismissed.`, `/sessions/${s.id}`);
  }

  await query(
    "UPDATE disputes SET status = 'resolved', resolution = $1, admin_notes = $2, resolved_by = $3, resolved_at = now() WHERE id = $4",
    [resolution, finalNotes, adminId, disputeId]
  );
  return { ok: true };
}
