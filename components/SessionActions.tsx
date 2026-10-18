"use client";
import { useState } from "react";

export default function SessionActions({
  sessionId,
  isProvider,
  status,
}: {
  sessionId: number;
  isProvider: boolean;
  status: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function act(action: string) {
    setBusy(action);
    setError("");
    const res = await fetch(`/api/sessions/${sessionId}/${action}`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      window.location.reload();
    } else {
      setBusy("");
      setError(data.error || "Action failed");
    }
  }

  return (
    <div className="row">
      {status === "requested" && isProvider ? (
        <>
          <button disabled={!!busy} onClick={() => act("accept")}>Accept</button>
          <button className="danger" disabled={!!busy} onClick={() => act("reject")}>Reject</button>
        </>
      ) : null}
      {status === "requested" && !isProvider ? (
        <span className="muted">Waiting for the provider to accept or reject.</span>
      ) : null}
      {status === "accepted" ? (
        <>
          <button disabled={!!busy} onClick={() => act("complete")}>Mark complete</button>
          <button className="danger" disabled={!!busy} onClick={() => act("cancel")}>Cancel (credits released)</button>
        </>
      ) : null}
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
