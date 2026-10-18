// Booking and session lifecycle (SRS 4.3/4.4, state diagram B.4):
//   requested -> accepted (credits reserved, chat opens)
//   requested -> rejected (no reservation)
//   accepted  -> cancelled (reservation released)
//   accepted  -> completed (credits transferred, two-way rating opens)

import { query, withTx } from "../db";
import { reserveCreditsQ, releaseCreditsQ, transferCreditsQ, InsufficientCreditsError } from "./wallet";
import { notify } from "./notifications";

export { InsufficientCreditsError };

export async function getSession(id: number) {
  const rows = await query(
    `SELECT s.*, su.name AS seeker_name, pu.name AS provider_name,
            COALESCE(o.skill_name, r.skill_needed) AS skill_label
     FROM sessions s
     JOIN users su ON su.id = s.seeker_id
     JOIN users pu ON pu.id = s.provider_id
     LEFT JOIN skill_offers o ON o.id = s.offer_id
     LEFT JOIN skill_requests r ON r.id = s.request_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function listUserSessions(userId: number) {
  return query(
    `SELECT s.*, su.name AS seeker_name, pu.name AS provider_name,
            COALESCE(o.skill_name, r.skill_needed) AS skill_label
     FROM sessions s
     JOIN users su ON su.id = s.seeker_id
     JOIN users pu ON pu.id = s.provider_id
     LEFT JOIN skill_offers o ON o.id = s.offer_id
     LEFT JOIN skill_requests r ON r.id = s.request_id
     WHERE s.seeker_id = $1 OR s.provider_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
}

// REQ-9 + REQ-10: seeker requests a booking; balance checked before it is sent.
export async function requestBooking(
  seekerId: number,
  offerId: number,
  scheduledAt: string
): Promise<{ id?: number; error?: string; status?: number }> {
  const offer = (await query(
    "SELECT * FROM skill_offers WHERE id = $1 AND status = 'active'",
    [offerId]
  ))[0];
  if (!offer) return { error: "Offer not found or no longer active.", status: 404 };
  if (offer.provider_id === seekerId) return { error: "You cannot book your own offer.", status: 400 };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime())) return { error: "Pick a valid date and time.", status: 400 };
  if (when.getTime() < Date.now()) return { error: "The session must be in the future.", status: 400 };
  const credits = Number(offer.duration_hours); // 1 hour = 1 time credit (SRS 4.3)
  const bal = (await query("SELECT credits FROM users WHERE id = $1", [seekerId]))[0];
  if (Number(bal.credits) < credits) {
    return {
      error: `Not enough credits: this session costs ${credits}, you have ${bal.credits} (REQ-10).`,
      status: 400,
    };
  }
  const rows = await query(
    `INSERT INTO sessions (offer_id, seeker_id, provider_id, scheduled_at, credits)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [offerId, seekerId, offer.provider_id, when.toISOString(), credits]
  );
  const id = Number(rows[0].id);
  await notify(
    offer.provider_id,
    "booking_requested",
    `New booking request for "${offer.skill_name}" (${credits} credit${credits > 1 ? "s" : ""}).`,
    `/sessions/${id}`
  );
  return { id };
}

function isParticipant(s: any, userId: number) {
  return s.seeker_id === userId || s.provider_id === userId;
}

// Provider accepts: credits reserved now (REQ-7); chat opens (REQ-11).
export async function acceptBooking(sessionId: number, providerId: number) {
  const s = await getSession(sessionId);
  if (!s || s.provider_id !== providerId) return { error: "Session not found.", status: 404 };
  if (s.status !== "requested") return { error: `Session is already ${s.status}.`, status: 400 };
  // Atomic: status flip + credit reservation commit together; a concurrent
  // accept finds status != 'requested' and reserves nothing.
  let conflict = false;
  await withTx(async (q) => {
    const flipped = await q(
      "UPDATE sessions SET status = 'accepted', updated_at = now() WHERE id = $1 AND status = 'requested' RETURNING id",
      [sessionId]
    );
    if (!flipped.length) { conflict = true; return; }
    await reserveCreditsQ(q, s.seeker_id, sessionId, Number(s.credits)); // throws InsufficientCreditsError -> rolls back
  });
  if (conflict) return { error: "Session is no longer requested.", status: 409 };
  await notify(s.seeker_id, "booking_accepted", `Your booking for "${s.skill_label}" was accepted. Chat is now open.`, `/sessions/${sessionId}`);
  return { ok: true };
}

// Provider rejects: no credits were ever reserved (SRS 4.3.2).
export async function rejectBooking(sessionId: number, providerId: number) {
  const s = await getSession(sessionId);
  if (!s || s.provider_id !== providerId) return { error: "Session not found.", status: 404 };
  if (s.status !== "requested") return { error: `Session is already ${s.status}.`, status: 400 };
  // Guarded: a concurrent accept wins the row; the loser gets a clean 409.
  const flipped = await query(
    "UPDATE sessions SET status = 'rejected', updated_at = now() WHERE id = $1 AND status = 'requested' RETURNING id",
    [sessionId]
  );
  if (!flipped.length) return { error: "Session is no longer requested.", status: 409 };
  await notify(s.seeker_id, "booking_rejected", `Your booking for "${s.skill_label}" was rejected.`, `/sessions/${sessionId}`);
  return { ok: true };
}

// Cancel after acceptance: reserved credits are released (SRS 4.3.2).
export async function cancelBooking(sessionId: number, userId: number) {
  const s = await getSession(sessionId);
  if (!s || !isParticipant(s, userId)) return { error: "Session not found.", status: 404 };
  if (s.status !== "requested" && s.status !== "accepted") {
    return { error: `Cannot cancel a ${s.status} session.`, status: 400 };
  }
  // Atomic: only the first concurrent cancel flips the state and releases.
  // The refund decision uses the status AT FLIP TIME (the FOR UPDATE CTE row),
  // not the earlier read - otherwise an accept that commits between our read
  // and our UPDATE would be cancelled without refunding the reservation.
  let conflict = false;
  await withTx(async (q) => {
    const rows = await q(
      `WITH prev AS (
         SELECT status FROM sessions WHERE id = $1 AND status IN ('requested','accepted') FOR UPDATE
       )
       UPDATE sessions SET status = 'cancelled', updated_at = now()
         FROM prev WHERE sessions.id = $1
       RETURNING prev.status AS prev_status`,
      [sessionId]
    );
    if (!rows.length) { conflict = true; return; }
    if (rows[0].prev_status === "accepted")
      await releaseCreditsQ(q, s.seeker_id, sessionId, Number(s.credits));
  });
  if (conflict) return { error: "Session can no longer be cancelled.", status: 409 };
  const other = s.seeker_id === userId ? s.provider_id : s.seeker_id;
  await notify(other, "booking_cancelled", `The session "${s.skill_label}" was cancelled.`, `/sessions/${sessionId}`);
  return { ok: true };
}

// REQ-13: mark complete -> credit transfer happens, rating opens for both sides.
export async function completeSession(sessionId: number, userId: number) {
  const s = await getSession(sessionId);
  if (!s || !isParticipant(s, userId)) return { error: "Session not found.", status: 404 };
  if (s.status !== "accepted") return { error: `Cannot complete a ${s.status} session.`, status: 400 };
  // Atomic: only the first concurrent complete flips the state and pays out.
  let conflict = false;
  await withTx(async (q) => {
    const flipped = await q(
      "UPDATE sessions SET status = 'completed', updated_at = now() WHERE id = $1 AND status = 'accepted' RETURNING id",
      [sessionId]
    );
    if (!flipped.length) { conflict = true; return; }
    await transferCreditsQ(q, s.provider_id, sessionId, Number(s.credits));
  });
  if (conflict) return { error: "Session is no longer accepted.", status: 409 };
  await notify(s.seeker_id, "session_completed", `"${s.skill_label}" is complete. Please rate your provider.`, `/sessions/${sessionId}`);
  await notify(s.provider_id, "session_completed", `"${s.skill_label}" is complete. You earned ${s.credits} credit(s). Please rate your seeker.`, `/sessions/${sessionId}`);
  return { ok: true };
}
