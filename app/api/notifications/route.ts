import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getNotifications } from "@/lib/services/notifications";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ ok: true, notifications: await getNotifications(user.id) });
}
