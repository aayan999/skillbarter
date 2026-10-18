import { NextRequest, NextResponse } from "next/server";
import { registerUser, createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await registerUser(
      String(body.name || ""),
      String(body.email || ""),
      String(body.collegeId || ""),
      String(body.password || "")
    );
    await createSessionCookie(user);
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Registration failed" }, { status: 400 });
  }
}
