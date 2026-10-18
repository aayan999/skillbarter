"use client";
import { useState } from "react";

export default function BookForm({ offerId, credits }: { offerId: number; credits: number }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, scheduledAt: f.get("scheduledAt") }),
    });
    const data = await res.json();
    if (data.ok) {
      window.location.href = `/sessions/${data.id}`;
    } else {
      setBusy(false);
      setError(data.error || "Booking failed");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="scheduledAt">Date and time</label>
        <input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
      </div>
      <p className="muted small">
        Costs {credits} credit{credits > 1 ? "s" : ""}. Your balance is checked before the
        request is sent (REQ-10); credits are reserved only if the provider accepts (REQ-7).
      </p>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Sending..." : "Request booking"}</button>
    </form>
  );
}
