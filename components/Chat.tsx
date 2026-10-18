"use client";
// REQ-11: real-time chat after booking acceptance. Uses Pusher when the public
// key is configured; otherwise polls every 3 seconds (SRS targets < 2s delivery
// with Pusher configured).
import { useEffect, useRef, useState } from "react";

type Msg = { id: number; sender_id: number; sender_name?: string; content: string; created_at: string };

export default function Chat({
  sessionId,
  currentUserId,
  initialMessages,
  pusherKey,
  pusherCluster,
}: {
  sessionId: number;
  currentUserId: number;
  initialMessages: Msg[];
  pusherKey: string;
  pusherCluster: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo(0, 999999);
  }, [messages]);

  useEffect(() => {
    let cleanup = () => {};
    if (pusherKey) {
      let cancelled = false;
      import("pusher-js").then(({ default: Pusher }) => {
        if (cancelled) return;
        const p = new Pusher(pusherKey, {
          cluster: pusherCluster,
          channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
        });
        const ch = p.subscribe(`private-session-${sessionId}`);
        ch.bind("new-message", (m: any) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        });
        cleanup = () => p.disconnect();
      });
      return () => { cancelled = true; cleanup(); };
    }
    const t = setInterval(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    }, 3000);
    return () => clearInterval(t);
  }, [sessionId, pusherKey, pusherCluster]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("content") as HTMLInputElement;
    const content = input.value;
    if (!content.trim()) return;
    const res = await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.ok) {
      input.value = "";
      setError("");
      const r2 = await fetch(`/api/sessions/${sessionId}/messages`);
      const d2 = await r2.json();
      if (d2.ok) setMessages(d2.messages);
    } else {
      setError(data.error || "Send failed");
    }
  }

  return (
    <div>
      <div className="chat-box" ref={boxRef}>
        {messages.length === 0 ? (
          <p className="muted small">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-msg${m.sender_id === currentUserId ? " mine" : ""}`}>
              <div className="who">{m.sender_id === currentUserId ? "You" : m.sender_name || "Them"}</div>
              <div>{m.content}</div>
            </div>
          ))
        )}
      </div>
      <form className="row" onSubmit={send} style={{ marginTop: "0.5rem" }}>
        <input name="content" placeholder="Type a message..." autoComplete="off" style={{ flex: 1 }} />
        <button type="submit">Send</button>
      </form>
      {error ? <p className="error small">{error}</p> : null}
      {!pusherKey ? (
        <p className="muted small">Live updates via 3s polling (set Pusher env vars for instant delivery).</p>
      ) : null}
    </div>
  );
}
