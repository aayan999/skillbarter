import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMessages, sendMessage } from "@/lib/services/chat";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const messages = await listMessages(Number(id), user.id);
  if (messages === null) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const result = await sendMessage(Number(id), user.id, String(body.content || ""));
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true });
}
