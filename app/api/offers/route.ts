import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOffer, listOffers } from "@/lib/services/offers";
import { SKILL_CATEGORIES } from "@/types";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;
  return NextResponse.json({ ok: true, offers: await listOffers(category) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const body = await req.json();
  const skillName = String(body.skillName || "").trim();
  const category = String(body.category || "General");
  const description = String(body.description || "");
  const durationHours = Number(body.durationHours);
  if (!skillName) return NextResponse.json({ ok: false, error: "Skill name is required." }, { status: 400 });
  if (!SKILL_CATEGORIES.includes(category as any))
    return NextResponse.json({ ok: false, error: "Unknown category." }, { status: 400 });
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 8)
    return NextResponse.json({ ok: false, error: "Duration must be 1-8 hours." }, { status: 400 });
  const id = await createOffer(user.id, skillName, category, description, durationHours);
  return NextResponse.json({ ok: true, id });
}
