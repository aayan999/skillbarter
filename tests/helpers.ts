// Test helpers: fresh in-memory PostgreSQL (PGlite) per test file.
process.env.PGLITE_DATA_DIR = "memory://";
process.env.SESSION_SECRET = "test-secret";

import { query } from "@/lib/db";
import { grantRegistrationBonus } from "@/lib/services/wallet";
import { withTx } from "@/lib/db";

let seq = 0;

export async function makeUser(name: string, isAdmin = false): Promise<number> {
  seq += 1;
  return withTx(async (q) => {
    const rows = await q(
      "INSERT INTO users (name, email, college_id, password_hash, is_admin) VALUES ($1,$2,$3,'x',$4) RETURNING id",
      [name, `${name.toLowerCase()}${seq}@test.edu`, `ROLL-${seq}`, isAdmin]
    );
    const id = Number(rows[0].id);
    await grantRegistrationBonus(q, id); // REQ-6: 2 free credits
    return id;
  });
}

export async function balance(userId: number): Promise<number> {
  const rows = await query("SELECT credits FROM users WHERE id = $1", [userId]);
  return Number(rows[0].credits);
}

export async function makeOffer(providerId: number, hours = 1): Promise<number> {
  seq += 1;
  const rows = await query(
    "INSERT INTO skill_offers (provider_id, skill_name, category, duration_hours) VALUES ($1,$2,'Programming',$3) RETURNING id",
    [providerId, `Skill ${seq}`, hours]
  );
  return Number(rows[0].id);
}

export async function txCount(userId: number): Promise<number> {
  const rows = await query("SELECT COUNT(*) AS c FROM credit_transactions WHERE user_id = $1", [userId]);
  return Number(rows[0].c);
}
