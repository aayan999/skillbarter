// Cloudinary storage for session files/videos (REQ-12).
// Everything is uploaded as resource_type "raw" with delivery type
// "authenticated", so assets can never be fetched without a signed URL.
// The download route checks session participation first, then issues a
// short-lived signed URL — keeping the SRS 5.3 participant-only rule.
// Without the CLOUDINARY_* env vars the app falls back to local disk (dev).

import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function client() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

// Uploads bytes and returns the Cloudinary public_id.
export async function uploadToCloudinary(
  sessionId: number,
  resourceId: number,
  fileName: string,
  data: Buffer
): Promise<string> {
  const c = client();
  const base = fileName.replace(/\.[A-Za-z0-9]{1,8}$/, "");
  const publicId = `skillbarter/${sessionId}/${resourceId}-${base}`;
  await new Promise<void>((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "raw", // uniform: any file type, no transformations
        type: "authenticated", // delivery requires a signed URL
        overwrite: true,
      },
      (err, result) => (err || !result ? reject(err || new Error("Cloudinary upload failed")) : resolve())
    );
    stream.end(data);
  });
  return publicId;
}

// Signed delivery URL for an authenticated asset (expires after 1 hour).
export function cloudinaryDownloadUrl(publicId: string): string {
  const c = client();
  return c.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  } as any);
}
