import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSession } from "@/lib/services/bookings";
import { listMessages } from "@/lib/services/chat";
import { listResources } from "@/lib/services/resources";
import { listSessionRatings } from "@/lib/services/ratings";
import SessionActions from "@/components/SessionActions";
import Chat from "@/components/Chat";
import ResourcePanel from "@/components/ResourcePanel";
import RatingForm from "@/components/RatingForm";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const sessionId = Number(id);
  const s = await getSession(sessionId);
  const isParticipant = s && (s.seeker_id === user.id || s.provider_id === user.id);
  if (!s || (!isParticipant && !user.isAdmin)) notFound();

  const isProvider = s.provider_id === user.id;
  const otherName = isProvider ? s.seeker_name : s.provider_name;
  const chatOpen = s.status === "accepted" || s.status === "completed";
  // SRS 5.3: chat and files are visible only to the two participants (admin excluded).
  const messages = isParticipant && chatOpen ? await listMessages(sessionId, user.id) : [];
  const resources = isParticipant ? (await listResources(sessionId, user.id)) || [] : [];
  const ratings = isParticipant ? await listSessionRatings(sessionId) : [];
  const alreadyRated = ratings.some((r: any) => r.rater_id === user.id);

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
        {isParticipant ? (
          <SessionActions sessionId={s.id} isProvider={isProvider} status={s.status} />
        ) : (
          <p className="muted small">Admin view: chat and files are visible to participants only (SRS 5.3).</p>
        )}
      </div>

      {isParticipant && chatOpen ? (
        <div className="grid cols-2">
          <div className="card">
            <h3>Chat</h3>
            <Chat
              sessionId={s.id}
              currentUserId={user.id}
              initialMessages={messages || []}
              pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY || ""}
              pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER || ""}
            />
          </div>
          <div className="card">
            <h3>Files &amp; videos</h3>
            <ResourcePanel sessionId={s.id} initialResources={resources} canShare={s.status === "accepted"} />
          </div>
        </div>
      ) : null}

      {isParticipant && s.status === "requested" ? (
        <div className="card">
          <p className="muted">Chat and file sharing open once the provider accepts (REQ-11, REQ-12).</p>
        </div>
      ) : null}

      {isParticipant && s.status === "completed" ? (
        <div className="card">
          <h3>Ratings</h3>
          {ratings.map((r: any) => (
            <p key={r.id}>
              <span className="stars">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span>{" "}
              by {r.rater_name}
              {r.review ? ` — ${r.review}` : ""}
            </p>
          ))}
          {!alreadyRated ? (
            <RatingForm sessionId={s.id} otherName={otherName} />
          ) : (
            <p className="muted small">You rated this session.</p>
          )}
          <p className="small">
            Something went wrong? <Link href={`/sessions/${s.id}/dispute`}>Report a dispute</Link>.
          </p>
        </div>
      ) : null}
    </>
  );
}
