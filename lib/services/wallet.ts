// Time-credit wallet rules (SRS 4.3, business rules 5.5):
// - REQ-6: 2 free credits at registration.
// - REQ-7: reserve on provider acceptance, transfer on completion, release on cancel.
// - REQ-8: balance never goes negative (CHECK constraint + FOR UPDATE guards).

import { query, withTx, QueryFn } from "../db";

export class InsufficientCreditsError extends Error {
  constructor(
    public needed: number,
    public available: number
  ) {
    super(`Insufficient credits: needs ${needed}, has ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

export async function getBalance(userId: number): Promise<number> {
  const rows = await query("SELECT credits FROM users WHERE id = $1", [userId]);
  return rows.length ? Number(rows[0].credits) : 0;
}

// Credits currently reserved by this user's accepted (not yet completed) bookings.
export async function getReserved(userId: number): Promise<number> {
  const rows = await query(
    "SELECT COALESCE(SUM(credits), 0) AS reserved FROM sessions WHERE seeker_id = $1 AND status = 'accepted'",
    [userId]
  );
  return Number(rows[0].reserved);
}

async function lockUserForUpdate(q: QueryFn, userId: number) {
  const rows = await q("SELECT id, credits FROM users WHERE id = $1 FOR UPDATE", [userId]);
  if (!rows.length) throw new Error(`User ${userId} not found`);
  return rows[0];
}

async function recordTx(
  q: QueryFn,
  userId: number,
  sessionId: number | null,
  amount: number,
  type: string,
  note = ""
) {
  const rows = await q("SELECT credits FROM users WHERE id = $1", [userId]);
  await q(
    "INSERT INTO credit_transactions (user_id, session_id, amount, type, balance_after, note) VALUES ($1,$2,$3,$4,$5,$6)",
    [userId, sessionId, amount, type, Number(rows[0].credits), note]
  );
}

// REQ-6 — called inside the user-creation transaction at registration.
export async function grantRegistrationBonus(q: QueryFn, userId: number) {
  await q("UPDATE users SET credits = credits + 2 WHERE id = $1", [userId]);
  await recordTx(q, userId, null, 2, "registration_bonus", "2 free credits at registration (REQ-6)");
}

// REQ-7 + REQ-8 — provider accepted: deduct and reserve from the seeker.
export async function reserveCredits(seekerId: number, sessionId: number | null, amount: number) {
  await withTx(async (q) => {
    const u = await lockUserForUpdate(q, seekerId);
    if (Number(u.credits) < amount) throw new InsufficientCreditsError(amount, Number(u.credits));
    await q("UPDATE users SET credits = credits - $1 WHERE id = $2", [amount, seekerId]);
    await recordTx(q, seekerId, sessionId, -amount, "reserve", "Reserved on booking acceptance (REQ-7)");
  });
}

// Booking cancelled after acceptance: the reservation is released back.
export async function releaseCredits(seekerId: number, sessionId: number | null, amount: number) {
  await withTx(async (q) => {
    await lockUserForUpdate(q, seekerId);
    await q("UPDATE users SET credits = credits + $1 WHERE id = $2", [amount, seekerId]);
    await recordTx(q, seekerId, sessionId, amount, "release", "Reservation released on cancellation");
  });
}

// REQ-7 — session completed: the provider earns the reserved credits.
export async function transferCredits(providerId: number, sessionId: number | null, amount: number) {
  await withTx(async (q) => {
    await lockUserForUpdate(q, providerId);
    await q("UPDATE users SET credits = credits + $1 WHERE id = $2", [amount, providerId]);
    await recordTx(q, providerId, sessionId, amount, "earn", "Credits earned on session completion (REQ-7)");
  });
}

// REQ-19 — admin reverses credits (provider -> seeker) after a dispute.
// REQ-8 still holds: the provider can never go negative, so if they already
// spent part of the credits the reversal is partial and the moved amount is
// returned so the caller can record it in the dispute notes.
export async function adminReverseCredits(
  providerId: number,
  seekerId: number,
  sessionId: number | null,
  amount: number
): Promise<number> {
  return withTx(async (q) => {
    const [first, second] =
      providerId < seekerId ? [providerId, seekerId] : [seekerId, providerId];
    await lockUserForUpdate(q, first);
    await lockUserForUpdate(q, second);
    const provider = (await q("SELECT credits FROM users WHERE id = $1", [providerId]))[0];
    const moved = Math.min(Number(provider.credits), amount);
    if (moved > 0) {
      await q("UPDATE users SET credits = credits - $1 WHERE id = $2", [moved, providerId]);
      await recordTx(q, providerId, sessionId, -moved, "admin_reversal", "Admin dispute reversal (debit)");
      await q("UPDATE users SET credits = credits + $1 WHERE id = $2", [moved, seekerId]);
      await recordTx(q, seekerId, sessionId, moved, "admin_reversal", "Admin dispute reversal (refund)");
    }
    return moved;
  });
}
