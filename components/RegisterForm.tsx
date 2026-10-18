"use client";
import { useState } from "react";

export default function RegisterForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        email: f.get("email"),
        collegeId: f.get("collegeId"),
        password: f.get("password"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      window.location.href = "/dashboard";
    } else {
      setError(data.error || "Registration failed");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" required />
      </div>
      <div>
        <label htmlFor="email">College email</label>
        <input id="email" name="email" type="email" required placeholder="you@college.edu" />
      </div>
      <div>
        <label htmlFor="collegeId">College ID / roll number</label>
        <input id="collegeId" name="collegeId" required placeholder="e.g. Roll No. 25" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={6} required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
      <p className="muted small">New accounts get 2 free time credits (REQ-6).</p>
    </form>
  );
}
