"use client";
import { useState } from "react";
import { SKILL_CATEGORIES } from "@/types";

export default function OfferForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillName: f.get("skillName"),
        category: f.get("category"),
        description: f.get("description"),
        durationHours: Number(f.get("durationHours")),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      window.location.href = "/offers";
    } else {
      setBusy(false);
      setError(data.error || "Failed to post offer");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="skillName">Skill you offer</label>
        <input id="skillName" name="skillName" required placeholder="e.g. Debugging C++ programs" />
      </div>
      <div>
        <label htmlFor="category">Category</label>
        <select id="category" name="category">
          {SKILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} placeholder="What you can help with, your experience..." />
      </div>
      <div>
        <label htmlFor="durationHours">Session length (hours; 1 hour = 1 credit)</label>
        <input id="durationHours" name="durationHours" type="number" min={1} max={8} defaultValue={1} required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Posting..." : "Post offer"}</button>
    </form>
  );
}
