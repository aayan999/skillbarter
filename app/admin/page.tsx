// REQ-18: admin dashboard — users, sessions, disputes, overall activity.
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { adminOverview, adminListUsers, adminListSessions, adminListDisputes } from "@/lib/services/admin";
import DisputeResolveForm from "@/components/DisputeResolveForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) redirect("/dashboard");
  const [stats, users, sessions, disputes] = await Promise.all([
    adminOverview(),
    adminListUsers(),
    adminListSessions(),
    adminListDisputes(),
  ]);
  const open = disputes.filter((d: any) => d.status === "open");

  return (
    <>
      <h2>Admin dashboard</h2>
      <div className="grid cols-4">
        <div className="card stat"><div className="num">{stats.users}</div><div className="label">Users</div></div>
        <div className="card stat"><div className="num">{stats.sessions}</div><div className="label">Sessions</div></div>
        <div className="card stat"><div className="num">{stats.openDisputes}</div><div className="label">Open disputes</div></div>
        <div className="card stat"><div className="num">{stats.creditsIssued}</div><div className="label">Credits issued</div></div>
      </div>

      <div className="card">
        <h3>Open disputes ({open.length})</h3>
        {open.length === 0 ? (
          <p className="muted small">No open disputes.</p>
        ) : (
          open.map((d: any) => (
            <div key={d.id} className="card" style={{ background: "var(--panel-2)" }}>
              <p>
                <span className="badge open">{d.reason}</span> on{" "}
                <Link href={`/sessions/${d.session_id}`}>session #{d.session_id}</Link> ({d.session_credits} credit(s)) —
                reported by {d.reporter_name}
              </p>
              <p>{d.description}</p>
              <p className="muted small">
                Seeker: {d.seeker_name} · Provider: {d.provider_name}
              </p>
              <DisputeResolveForm
                disputeId={d.id}
                seekerId={d.seeker_id}
                providerId={d.provider_id}
                seekerName={d.seeker_name}
                providerName={d.provider_name}
              />
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Resolved disputes</h3>
        {disputes.filter((d: any) => d.status === "resolved").length === 0 ? (
          <p className="muted small">None yet.</p>
        ) : (
          <table className="list">
            <thead><tr><th>ID</th><th>Reason</th><th>Reporter</th><th>Resolution</th><th>Notes</th></tr></thead>
            <tbody>
              {disputes.filter((d: any) => d.status === "resolved").map((d: any) => (
                <tr key={d.id}>
                  <td>#{d.id}</td><td>{d.reason}</td><td>{d.reporter_name}</td>
                  <td><span className="badge resolved">{d.resolution}</span></td>
                  <td className="small">{d.admin_notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Users</h3>
        <table className="list">
          <thead><tr><th>Name</th><th>Email</th><th>College ID</th><th>Credits</th><th>Rating</th><th>Sessions</th><th>Warnings</th></tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>{u.name}{u.is_admin ? " 🛡" : ""}</td>
                <td className="small">{u.email}</td>
                <td className="small">{u.college_id}</td>
                <td>{u.credits}</td>
                <td>{u.avg_rating ? Number(u.avg_rating).toFixed(1) : "-"}</td>
                <td>{u.session_count}</td>
                <td>{u.warnings > 0 ? `⚠ ${u.warnings}` : "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Recent sessions</h3>
        <table className="list">
          <thead><tr><th>ID</th><th>Skill</th><th>Seeker</th><th>Provider</th><th>Credits</th><th>Status</th></tr></thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.id}>
                <td><Link href={`/sessions/${s.id}`}>#{s.id}</Link></td>
                <td>{s.skill_label}</td>
                <td>{s.seeker_name}</td>
                <td>{s.provider_name}</td>
                <td>{s.credits}</td>
                <td><span className={`badge ${s.status}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
