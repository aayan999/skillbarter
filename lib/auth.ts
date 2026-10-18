// REQ-1: registration and login with college email/ID.
// Passwords hashed with bcrypt; session is an httpOnly JWT cookie (jose).

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query, withTx } from "./db";
import { grantRegistrationBonus } from "./services/wallet";

const COOKIE = "sb_session";
const encoder = new TextEncoder();

function secret() {
  return encoder.encode(process.env.SESSION_SECRET || "dev-secret-change-me");
}

export type SessionUser = { id: number; name: string; email: string; isAdmin: boolean };

export async function registerUser(
  name: string,
  email: string,
  collegeId: string,
  password: string
) {
  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (!collegeId.trim()) throw new Error("College ID is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const hash = await bcrypt.hash(password, 10);
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email);
  try {
    return await withTx(async (q) => {
      const rows = await q(
        "INSERT INTO users (name, email, college_id, password_hash, is_admin) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, is_admin",
        [name.trim(), email, collegeId.trim(), hash, isAdmin]
      );
      await grantRegistrationBonus(q, rows[0].id);
      return {
        id: Number(rows[0].id),
        name: rows[0].name as string,
        email: rows[0].email as string,
        isAdmin: Boolean(rows[0].is_admin),
      };
    });
  } catch (e: any) {
    if (String(e?.message || "").toLowerCase().includes("unique")) {
      throw new Error("An account with this email already exists.");
    }
    throw e;
  }
}

export async function loginUser(email: string, password: string): Promise<SessionUser | null> {
  const rows = await query(
    "SELECT id, name, email, password_hash, is_admin FROM users WHERE email = $1",
    [email.trim().toLowerCase()]
  );
  if (!rows.length) return null;
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return null;
  return {
    id: Number(rows[0].id),
    name: rows[0].name,
    email: rows[0].email,
    isAdmin: Boolean(rows[0].is_admin),
  };
}

export async function createSessionCookie(user: SessionUser) {
  const token = await new SignJWT({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    admin: user.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: Number(payload.sub),
      name: String(payload.name),
      email: String(payload.email),
      isAdmin: Boolean(payload.admin),
    };
  } catch {
    return null;
  }
}
