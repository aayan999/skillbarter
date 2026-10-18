"use client";
export default function MarkReadButton() {
  return (
    <button
      className="secondary"
      onClick={async () => {
        await fetch("/api/notifications/read", { method: "POST" });
        window.location.reload();
      }}
    >
      Mark all read
    </button>
  );
}
