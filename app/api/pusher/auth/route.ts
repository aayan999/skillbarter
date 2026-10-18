// Pusher private-channel auth: only the two session participants may subscribe.
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPusher } from "@/lib/pusher";
import { getSessionForParty } from "@/lib/services/chat";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id") || "";
  const channel = params.get("channel_name") || "";
  const match = channel.match(/^private-session-(\d+)$/);
  if (!match) return NextResponse.json({ error: "Bad channel" }, { status: 400 });
  const s = await getSessionForParty(Number(match[1]), user.id);
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
