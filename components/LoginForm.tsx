"use client";
import { useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      window.location.href = "/dashboard";
    } else {
      setError(data.error || "Login failed");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div>
        <label htmlFor="email">College email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
    </form>
  );
}
