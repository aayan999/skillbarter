"use client";
// REQ-19: admin reviews a dispute, reverses credits or warns the user involved.
import { useState } from "react";

export default function DisputeResolveForm({
  disputeId,
  seekerId,
  providerId,
  seekerName,
  providerName,
}: {
  disputeId: number;
  seekerId: number;
  providerId: number;
  seekerName: string;
  providerName: string;
}) {
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("warn_user");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: f.get("action"),
        notes: f.get("notes"),
        warnedUserId: f.get("warnedUserId") || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setDone("Resolved.");
    else setError(data.error || "Failed");
  }

  if (done) return <p className="success">{done}</p>;
  return (
    <form className="stack" onSubmit={onSubmit} style={{ maxWidth: "100%" }}>
      <div className="row">
        <select name="action" value={action} onChange={(e) => setAction(e.target.value)} style={{ width: "auto" }}>
          <option value="warn_user">Warn the user involved</option>
          <option value="reverse_credits">Reverse the credits</option>
          <option value="dismiss">Dismiss</option>
        </select>
        {action === "warn_user" ? (
          <select name="warnedUserId" style={{ width: "auto" }}>
            <option value={providerId}>Warn provider ({providerName})</option>
            <option value={seekerId}>Warn seeker ({seekerName})</option>
          </select>
        ) : null}
      </div>
      <textarea name="notes" rows={2} placeholder="Admin notes (visible in the dispute record)" />
      {error ? <p className="error">{error}</p> : null}
      <div><button disabled={busy}>{busy ? "Saving..." : "Resolve"}</button></div>
    </form>
  );
}
