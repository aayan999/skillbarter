// REQ-12: share notes/files and short recorded videos inside a session.
// Same visibility rule as chat (SRS 5.3): participants only, after acceptance.
// Storage: Cloudinary (lib/cloudinary.ts) when configured, else local disk.
// file_url stores "cld:<public_id>" for Cloudinary assets, otherwise the
// local API path — the download route resolves either form.

import { query } from "../db";
import { getSessionForParty } from "./chat";

// Strips path components and unsafe characters from uploaded filenames.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || "upload";
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export async function listResources(sessionId: number, userId: number) {
  const s = await getSessionForParty(sessionId, userId);
  if (!s) return null;
  return query(
    `SELECT r.*, u.name AS uploader_name FROM resources r
     JOIN users u ON u.id = r.uploader_id
     WHERE r.session_id = $1 ORDER BY r.created_at ASC`,
    [sessionId]
  );
}

export async function getResource(sessionId: number, resourceId: number, userId: number) {
  const s = await getSessionForParty(sessionId, userId);
  if (!s) return null;
  const rows = await query("SELECT * FROM resources WHERE id = $1 AND session_id = $2", [
    resourceId,
    sessionId,
  ]);
  return rows[0] || null;
}

export async function createResource(
  sessionId: number,
  uploaderId: number,
  fileType: "file" | "video",
  fileName: string,
  byteSize: number,
  storageRef?: string // "cld:<public_id>" for Cloudinary uploads
) {
  const rows = await query(
    `INSERT INTO resources (session_id, uploader_id, file_type, file_name, file_url, byte_size)
     VALUES ($1,$2,$3,$4,'',$5) RETURNING id`,
    [sessionId, uploaderId, fileType, fileName, byteSize]
  );
  const id = Number(rows[0].id);
  await query("UPDATE resources SET file_url = $1 WHERE id = $2", [
    storageRef ?? `/api/sessions/${sessionId}/resources/${id}`,
    id,
  ]);
  return id;
}

export async function sharingOpen(sessionId: number, userId: number) {
  const s = await getSessionForParty(sessionId, userId);
  return !!s && (s.status === "accepted" || s.status === "completed");
}
