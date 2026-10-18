"use client";
import { useState } from "react";
import { SKILL_CATEGORIES } from "@/types";

export default function RequestForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillNeeded: f.get("skillNeeded"),
        category: f.get("category"),
        description: f.get("description"),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      window.location.href = "/requests";
    } else {
      setBusy(false);
      setError(data.error || "Failed to post request");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="skillNeeded">Skill you need help with</label>
        <input id="skillNeeded" name="skillNeeded" required placeholder="e.g. Resume review" />
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
        <label htmlFor="description">Details</label>
        <textarea id="description" name="description" rows={3} placeholder="What exactly do you need?" />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Posting..." : "Post request"}</button>
    </form>
  );
}
