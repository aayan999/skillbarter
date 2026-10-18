import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOffer } from "@/lib/services/offers";

export const dynamic = "force-dynamic";

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const offer = await getOffer(Number(id));
  if (!offer) notFound();
  const mine = offer.provider_id === user.id;
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{offer.skill_name}</h2>
        <span className="badge">{offer.category}</span>
      </div>
      <p className="muted">
        Offered by {offer.provider_name}
        {offer.provider_rating ? ` (★ ${Number(offer.provider_rating).toFixed(1)})` : ""} ·{" "}
        {offer.duration_hours} hour(s) = {offer.duration_hours} credit(s)
      </p>
      {offer.description ? <p>{offer.description}</p> : null}
      {offer.status !== "active" ? (
        <p className="badge rejected">This offer is deactivated</p>
      ) : mine ? (
        <p className="muted">This is your own offer.</p>
      ) : (
        <p>
          <Link className="btn" href={`/offers/${offer.id}/book`}>Book a session</Link>
        </p>
      )}
    </div>
  );
}
