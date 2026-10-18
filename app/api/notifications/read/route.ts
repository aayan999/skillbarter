import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markAllRead } from "@/lib/services/notifications";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  await markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
