import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Name is too short." }, { status: 400 });
  }
  await query("UPDATE users SET name = $1 WHERE id = $2", [name, user.id]);
  return NextResponse.json({ ok: true });
}
