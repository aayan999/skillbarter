import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { submitRating } from "@/lib/services/ratings";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const result = await submitRating(Number(id), user.id, Number(body.score), String(body.review || ""));
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true });
}
