import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listUserSessions } from "@/lib/services/bookings";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sessions = await listUserSessions(user.id);
  return (
    <>
      <h2>My sessions</h2>
      {sessions.length === 0 ? (
        <div className="card">
          <p className="muted">
            No sessions yet. <Link href="/offers">Browse offers</Link> to book one.
          </p>
        </div>
      ) : (
        <div className="card">
          <table className="list">
            <thead>
              <tr><th>Skill</th><th>Role</th><th>With</th><th>When</th><th>Credits</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => (
                <tr key={s.id}>
                  <td><Link href={`/sessions/${s.id}`}>{s.skill_label}</Link></td>
                  <td>{s.seeker_id === user.id ? "Seeker" : "Provider"}</td>
                  <td>{s.seeker_id === user.id ? s.provider_name : s.seeker_name}</td>
                  <td>{new Date(s.scheduled_at).toLocaleString()}</td>
                  <td>{s.credits}</td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
