// REQ-14: two-way rating and review after a completed session.
import { query, withTx } from "../db";

export async function submitRating(
  sessionId: number,
  raterId: number,
  score: number,
  review: string
) {
  const s = (await query("SELECT * FROM sessions WHERE id = $1", [sessionId]))[0];
  if (!s || (s.seeker_id !== raterId && s.provider_id !== raterId))
    return { error: "Session not found.", status: 404 };
  if (s.status !== "completed")
    return { error: "You can rate only after the session is completed.", status: 400 };
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return { error: "Score must be 1-5.", status: 400 };
  const rateeId = s.seeker_id === raterId ? s.provider_id : s.seeker_id;
  try {
    await withTx(async (q) => {
      await q(
        "INSERT INTO ratings (session_id, rater_id, ratee_id, score, review) VALUES ($1,$2,$3,$4,$5)",
        [sessionId, raterId, rateeId, score, review.trim()]
      );
      const avg = await q("SELECT AVG(score) AS a FROM ratings WHERE ratee_id = $1", [rateeId]);
      await q("UPDATE users SET avg_rating = $1 WHERE id = $2", [Number(avg[0].a), rateeId]);
    });
  } catch (e: any) {
    if (String(e?.message || "").toLowerCase().includes("unique"))
      return { error: "You already rated this session.", status: 400 };
    throw e;
  }
  return { ok: true };
}

export async function listSessionRatings(sessionId: number) {
  return query(
    `SELECT r.*, u.name AS rater_name FROM ratings r
     JOIN users u ON u.id = r.rater_id WHERE r.session_id = $1 ORDER BY r.created_at ASC`,
    [sessionId]
  );
}

export async function listRatingsFor(userId: number) {
  return query(
    `SELECT r.*, u.name AS rater_name FROM ratings r
     JOIN users u ON u.id = r.rater_id WHERE r.ratee_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [userId]
  );
}
