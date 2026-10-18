// REQ-5: categorized listings of skill requests.
import Link from "next/link";
import { listRequests } from "@/lib/services/offers";
import CategoryFilter from "@/components/CategoryFilter";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const requests = await listRequests(category);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Skill requests</h2>
        <Link className="btn" href="/requests/new">+ Post a request</Link>
      </div>
      <CategoryFilter base="/requests" active={category} />
      {requests.length === 0 ? (
        <div className="card"><p className="muted">No open requests in this category.</p></div>
      ) : (
        requests.map((r: any) => (
          <div className="card" key={r.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{r.skill_needed}</h3>
              <span className="badge">{r.category}</span>
            </div>
            <p className="muted small">requested by {r.seeker_name}</p>
            {r.description ? <p>{r.description}</p> : null}
          </div>
        ))
      )}
    </>
  );
}
