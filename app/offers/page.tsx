// REQ-5: categorized listings of skill offers.
import Link from "next/link";
import { listOffers } from "@/lib/services/offers";
import CategoryFilter from "@/components/CategoryFilter";

export const dynamic = "force-dynamic";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const offers = await listOffers(category);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Skill offers</h2>
        <Link className="btn" href="/offers/new">+ Post an offer</Link>
      </div>
      <CategoryFilter base="/offers" active={category} />
      {offers.length === 0 ? (
        <div className="card"><p className="muted">No offers in this category yet.</p></div>
      ) : (
        offers.map((o: any) => (
          <div className="card" key={o.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>
                <Link href={`/offers/${o.id}`}>{o.skill_name}</Link>
              </h3>
              <span className="badge">{o.category}</span>
            </div>
            <p className="muted small">
              by {o.provider_name}
              {o.provider_rating ? ` (★ ${Number(o.provider_rating).toFixed(1)})` : ""} ·{" "}
              {o.duration_hours}h = {o.duration_hours} credit{o.duration_hours > 1 ? "s" : ""}
            </p>
            {o.description ? <p>{o.description}</p> : null}
          </div>
        ))
      )}
    </>
  );
}
