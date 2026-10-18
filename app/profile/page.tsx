// REQ-2: user profile listing the skills the student offers.
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBalance } from "@/lib/services/wallet";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const rows = await query(
    "SELECT id, name, email, college_id, avg_rating, warnings, created_at FROM users WHERE id = $1",
    [user.id]
  );
  const me = rows[0];
  const offers = await query(
    "SELECT id, skill_name, category, duration_hours, status FROM skill_offers WHERE provider_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  const credits = await getBalance(user.id);

  return (
    <>
      <div className="card">
        <h2>My profile</h2>
        <p>
          <strong>{me.name}</strong> ({me.email})<br />
          <span className="muted">
            College ID: {me.college_id} · Credits: {credits} ·{" "}
            {me.avg_rating ? `Rating: ${Number(me.avg_rating).toFixed(1)} / 5` : "No ratings yet"}
            {me.warnings > 0 ? ` · ⚠ ${me.warnings} admin warning(s)` : ""}
          </span>
        </p>
        <ProfileForm initialName={me.name} />
      </div>
      <div className="card">
        <h3>Skills I offer</h3>
        {offers.length === 0 ? (
          <p className="muted">
            Nothing yet. <Link href="/offers/new">Post your first skill offer</Link>.
          </p>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o: any) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/offers/${o.id}`}>{o.skill_name}</Link>
                  </td>
                  <td>{o.category}</td>
                  <td>{o.duration_hours}h</td>
                  <td>
                    <span className={`badge ${o.status}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
