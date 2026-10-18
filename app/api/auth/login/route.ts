import { NextRequest, NextResponse } from "next/server";
import { loginUser, createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await loginUser(String(body.email || ""), String(body.password || ""));
  if (!user) {
    return NextResponse.json({ ok: false, error: "Wrong email or password." }, { status: 401 });
  }
  await createSessionCookie(user);
  return NextResponse.json({ ok: true, user });
}
