import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSession } from "@/lib/services/bookings";
import SessionActions from "@/components/SessionActions";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const s = await getSession(Number(id));
  if (!s || (s.seeker_id !== user.id && s.provider_id !== user.id && !user.isAdmin)) notFound();
  const isProvider = s.provider_id === user.id;
  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{s.skill_label}</h2>
          <span className={`badge ${s.status}`}>{s.status}</span>
        </div>
        <p className="muted">
          Seeker: {s.seeker_name} · Provider: {s.provider_name} ·{" "}
          {new Date(s.scheduled_at).toLocaleString()} · {s.credits} credit(s)
        </p>
        <SessionActions sessionId={s.id} isProvider={isProvider} status={s.status} />
      </div>
    </>
  );
}
