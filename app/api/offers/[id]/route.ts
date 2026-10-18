import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deactivateOffer } from "@/lib/services/offers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const ok = await deactivateOffer(Number(id), user.id);
  if (!ok) return NextResponse.json({ ok: false, error: "Offer not found or not yours." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
