"use client";
import { useState } from "react";

export default function ProfileForm({ initialName }: { initialName: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name") }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.ok ? "Saved." : data.error || "Save failed");
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="name">Display name</label>
        <input id="name" name="name" defaultValue={initialName} required minLength={2} />
      </div>
      {msg ? <p className="success">{msg}</p> : null}
      <button disabled={busy}>{busy ? "Saving..." : "Save"}</button>
    </form>
  );
}
