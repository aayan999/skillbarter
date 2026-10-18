import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getResource } from "@/lib/services/resources";
import { cloudinaryConfigured, cloudinaryDownloadUrl } from "@/lib/cloudinary";
import fs from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".txt": "text/plain", ".md": "text/markdown",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".zip": "application/zip",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  const { id, rid } = await params;
  const resource = await getResource(Number(id), Number(rid), user.id);
  if (!resource) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Cloudinary-backed asset: only reachable after the participant check above,
  // which is what keeps the file participant-only (SRS 5.3); the signed URL
  // expires after 1 hour.
  if (String(resource.file_url).startsWith("cld:")) {
    if (!cloudinaryConfigured())
      return NextResponse.json({ ok: false, error: "Storage not configured." }, { status: 500 });
    return NextResponse.redirect(cloudinaryDownloadUrl(resource.file_url.slice(4)), 302);
  }

  const root = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const filePath = path.join(root, String(id), `${resource.id}-${resource.file_name}`);
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(resource.file_name).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${resource.file_name}"`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File missing on disk." }, { status: 404 });
  }
}
