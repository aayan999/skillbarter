// REQ-17: user dashboard — credits, sessions, offers/requests, ratings + notifications.
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBalance, getReserved } from "@/lib/services/wallet";
import { listUserSessions } from "@/lib/services/bookings";
import { listRatingsFor } from "@/lib/services/ratings";
import { getNotifications } from "@/lib/services/notifications";
import { createSessionReminders } from "@/lib/services/disputes";
import MarkReadButton from "@/components/MarkReadButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await createSessionReminders(user.id); // REQ-15 session reminders
  const [credits, reserved, sessions, ratings, notifications, myOffers, myRequests] =
    await Promise.all([
      getBalance(user.id),
      getReserved(user.id),
      listUserSessions(user.id),
      listRatingsFor(user.id),
      getNotifications(user.id),
      query("SELECT id, skill_name, status FROM skill_offers WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 5", [user.id]),
      query("SELECT id, skill_needed, status FROM skill_requests WHERE seeker_id = $1 ORDER BY created_at DESC LIMIT 5", [user.id]),
    ]);
  const upcoming = sessions.filter((s: any) => ["requested", "accepted"].includes(s.status));
  const avgRow = (await query("SELECT avg_rating FROM users WHERE id = $1", [user.id]))[0];
  const unread = notifications.filter((n: any) => !n.read).length;

  return (
    <>
      <div className="grid cols-4">
        <div className="card stat"><div className="num">{credits}</div><div className="label">Credits available</div></div>
        <div className="card stat"><div className="num">{reserved}</div><div className="label">Credits reserved</div></div>
        <div className="card stat"><div className="num">{upcoming.length}</div><div className="label">Active sessions</div></div>
        <div className="card stat">
          <div className="num">{avgRow.avg_rating ? Number(avgRow.avg_rating).toFixed(1) : "-"}</div>
          <div className="label">Average rating</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Notifications {unread ? <span className="badge accepted">{unread} new</span> : null}</h3>
            <MarkReadButton />
          </div>
          {notifications.length === 0 ? (
            <p className="muted small">No notifications yet.</p>
          ) : (
            notifications.slice(0, 10).map((n: any) => (
              <div key={n.id} className={`notif${n.read ? "" : " unread"}`}>
                {n.link ? <Link href={n.link}>{n.message}</Link> : n.message}
                <div className="muted small">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3>Active sessions</h3>
          {upcoming.length === 0 ? (
            <p className="muted small">
              Nothing active. <Link href="/offers">Browse offers</Link> or{" "}
              <Link href="/requests">requests</Link>.
            </p>
          ) : (
            <table className="list">
              <tbody>
                {upcoming.map((s: any) => (
                  <tr key={s.id}>
                    <td><Link href={`/sessions/${s.id}`}>{s.skill_label}</Link></td>
                    <td>{s.seeker_id === user.id ? `with ${s.provider_name}` : `for ${s.seeker_name}`}</td>
                    <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>My offers</h3>
          {myOffers.length === 0 ? (
            <p className="muted small"><Link href="/offers/new">Post your first offer</Link>.</p>
          ) : (
            <ul>
              {myOffers.map((o: any) => (
                <li key={o.id}>
                  <Link href={`/offers/${o.id}`}>{o.skill_name}</Link>{" "}
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>My requests</h3>
          {myRequests.length === 0 ? (
            <p className="muted small"><Link href="/requests/new">Post your first request</Link>.</p>
          ) : (
            <ul>
              {myRequests.map((r: any) => (
                <li key={r.id}>
                  {r.skill_needed} <span className={`badge ${r.status}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Recent ratings</h3>
        {ratings.length === 0 ? (
          <p className="muted small">No ratings yet.</p>
        ) : (
          ratings.slice(0, 5).map((r: any) => (
            <p key={r.id}>
              <span className="stars">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span> by {r.rater_name}
              {r.review ? ` — ${r.review}` : ""}
            </p>
          ))
        )}
      </div>
    </>
  );
}
