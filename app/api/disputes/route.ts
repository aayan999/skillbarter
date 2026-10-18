import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createDispute } from "@/lib/services/disputes";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const body = await req.json();
  const result = await createDispute(
    Number(body.sessionId),
    user.id,
    String(body.reason || ""),
    String(body.description || "")
  );
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
