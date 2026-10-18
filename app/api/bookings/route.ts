import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requestBooking } from "@/lib/services/bookings";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const body = await req.json();
  const result = await requestBooking(user.id, Number(body.offerId), String(body.scheduledAt || ""));
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
