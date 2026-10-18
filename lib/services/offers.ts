// REQ-3/REQ-4/REQ-5: skill offers, skill requests, categorized listings.
import { query } from "../db";

export async function createOffer(
  providerId: number,
  skillName: string,
  category: string,
  description: string,
  durationHours: number
) {
  const rows = await query(
    `INSERT INTO skill_offers (provider_id, skill_name, category, description, duration_hours)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [providerId, skillName.trim(), category, description.trim(), durationHours]
  );
  return Number(rows[0].id);
}

export async function listOffers(category?: string) {
  const where = category ? "AND LOWER(o.category) = LOWER($1)" : "";
  const params: unknown[] = category ? [category] : [];
  return query(
    `SELECT o.*, u.name AS provider_name, u.avg_rating AS provider_rating
     FROM skill_offers o JOIN users u ON u.id = o.provider_id
     WHERE o.status = 'active' ${where}
     ORDER BY o.created_at DESC`,
    params
  );
}

export async function getOffer(id: number) {
  const rows = await query(
    `SELECT o.*, u.name AS provider_name, u.avg_rating AS provider_rating
     FROM skill_offers o JOIN users u ON u.id = o.provider_id WHERE o.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function deactivateOffer(id: number, providerId: number) {
  const res = await query(
    "UPDATE skill_offers SET status = 'deactivated' WHERE id = $1 AND provider_id = $2 RETURNING id",
    [id, providerId]
  );
  return res.length > 0;
}

export async function createRequest(
  seekerId: number,
  skillNeeded: string,
  category: string,
  description: string
) {
  const rows = await query(
    `INSERT INTO skill_requests (seeker_id, skill_needed, category, description)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [seekerId, skillNeeded.trim(), category, description.trim()]
  );
  return Number(rows[0].id);
}

export async function listRequests(category?: string) {
  const where = category ? "AND LOWER(r.category) = LOWER($1)" : "";
  const params: unknown[] = category ? [category] : [];
  return query(
    `SELECT r.*, u.name AS seeker_name
     FROM skill_requests r JOIN users u ON u.id = r.seeker_id
     WHERE r.status = 'open' ${where}
     ORDER BY r.created_at DESC`,
    params
  );
}

export async function closeRequest(id: number, seekerId: number) {
  const res = await query(
    "UPDATE skill_requests SET status = 'closed' WHERE id = $1 AND seeker_id = $2 RETURNING id",
    [id, seekerId]
  );
  return res.length > 0;
}
