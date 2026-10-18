import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createRequest, listRequests } from "@/lib/services/offers";
import { SKILL_CATEGORIES } from "@/types";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;
  return NextResponse.json({ ok: true, requests: await listRequests(category) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const body = await req.json();
  const skillNeeded = String(body.skillNeeded || "").trim();
  const category = String(body.category || "General");
  const description = String(body.description || "");
  if (!skillNeeded) return NextResponse.json({ ok: false, error: "Skill needed is required." }, { status: 400 });
  if (!SKILL_CATEGORIES.includes(category as any))
    return NextResponse.json({ ok: false, error: "Unknown category." }, { status: 400 });
  const id = await createRequest(user.id, skillNeeded, category, description);
  return NextResponse.json({ ok: true, id });
}
