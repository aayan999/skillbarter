import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveDispute } from "@/lib/services/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const action = String(body.action || "");
  if (!["reverse_credits", "warn_user", "dismiss"].includes(action))
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  const result = await resolveDispute(
    Number(id),
    user.id,
    action as any,
    String(body.notes || ""),
    body.warnedUserId ? Number(body.warnedUserId) : undefined
  );
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true });
}
