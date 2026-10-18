"use client";
// REQ-12: share notes/files and short recorded videos inside the session.
import { useState } from "react";

type Res = {
  id: number; file_type: string; file_name: string; byte_size: number;
  uploader_name?: string; created_at: string;
};

export default function ResourcePanel({
  sessionId,
  initialResources,
  canShare,
}: {
  sessionId: number;
  initialResources: Res[];
  canShare: boolean;
}) {
  const [resources, setResources] = useState<Res[]>(initialResources);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    if (!input.files?.length) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", input.files[0]);
    const res = await fetch(`/api/sessions/${sessionId}/resources`, { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      form.reset();
      const r2 = await fetch(`/api/sessions/${sessionId}/resources`);
      const d2 = await r2.json();
      if (d2.ok) setResources(d2.resources);
    } else {
      setError(data.error || "Upload failed");
    }
  }

  return (
    <div>
      {resources.length === 0 ? (
        <p className="muted small">No files or videos shared yet.</p>
      ) : (
        <ul>
          {resources.map((r) => (
            <li key={r.id}>
              <a href={`/api/sessions/${sessionId}/resources/${r.id}`} target="_blank" rel="noreferrer">
                {r.file_type === "video" ? "🎬" : "📄"} {r.file_name}
              </a>{" "}
              <span className="muted small">
                ({Math.ceil(r.byte_size / 1024)} KB, by {r.uploader_name})
              </span>
            </li>
          ))}
        </ul>
      )}
      {canShare ? (
        <form className="row" onSubmit={upload}>
          <input name="file" type="file" required style={{ flex: 1 }} />
          <button disabled={busy}>{busy ? "Uploading..." : "Share"}</button>
        </form>
      ) : null}
      {error ? <p className="error small">{error}</p> : null}
      <p className="muted small">Files and short videos up to 25 MB.</p>
    </div>
  );
}
