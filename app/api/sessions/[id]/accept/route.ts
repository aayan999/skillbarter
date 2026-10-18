import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { acceptBooking, InsufficientCreditsError } from "@/lib/services/bookings";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await acceptBooking(Number(id), user.id);
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { ok: false, error: `Seeker no longer has enough credits (${e.available}/${e.needed}); cannot accept.` },
        { status: 409 }
      );
    }
    throw e;
  }
}
