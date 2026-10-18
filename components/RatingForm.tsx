"use client";
// REQ-14: two-way rating after a completed session.
import { useState } from "react";

export default function RatingForm({ sessionId, otherName }: { sessionId: number; otherName: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/sessions/${sessionId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: Number(f.get("score")), review: f.get("review") }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setDone(true);
    else setError(data.error || "Rating failed");
  }

  if (done) return <p className="success">Thanks! Your rating was submitted.</p>;
  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="score">Rate {otherName} (1-5)</label>
        <select id="score" name="score" defaultValue="5">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="review">Review (optional)</label>
        <textarea id="review" name="review" rows={2} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Submitting..." : "Submit rating"}</button>
    </form>
  );
}
