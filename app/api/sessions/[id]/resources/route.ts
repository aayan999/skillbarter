import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listResources, createResource, sharingOpen } from "@/lib/services/resources";
import { getSessionForParty } from "@/lib/services/chat";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const resources = await listResources(Number(id), user.id);
  if (resources === null) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, resources });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id } = await params;
  const sessionId = Number(id);
  const s = await getSessionForParty(sessionId, user.id);
  if (!s) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!(await sharingOpen(sessionId, user.id)))
    return NextResponse.json(
      { ok: false, error: "Sharing opens after the provider accepts the booking (REQ-12)." },
      { status: 403 }
    );
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "File too large (25 MB max)." }, { status: 400 });
  const fileType = VIDEO_TYPES.includes(file.type) ? "video" : "file";
  const safeName = path.basename(file.name).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "upload";
  const resourceId = await createResource(sessionId, user.id, fileType, safeName, file.size);
  const dir = path.join(uploadRoot(), String(sessionId));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${resourceId}-${safeName}`), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ ok: true, id: resourceId, fileType });
}
