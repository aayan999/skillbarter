"use client";
import { useState } from "react";

export default function DisputeForm({ sessionId }: { sessionId: number }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        reason: f.get("reason"),
        description: f.get("description"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setDone(true);
    else setError(data.error || "Report failed");
  }

  if (done)
    return <p className="success">Report submitted. The admin will review it (REQ-16).</p>;
  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="reason">Reason</label>
        <select id="reason" name="reason">
          <option value="no_show">No-show</option>
          <option value="poor_quality">Poor quality</option>
          <option value="credit_issue">Credit issue</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="description">What happened?</label>
        <textarea id="description" name="description" rows={4} required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Sending..." : "Report dispute"}</button>
    </form>
  );
}
