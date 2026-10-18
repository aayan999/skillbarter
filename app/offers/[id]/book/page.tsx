import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOffer } from "@/lib/services/offers";
import { getBalance } from "@/lib/services/wallet";
import BookForm from "@/components/BookForm";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const offer = await getOffer(Number(id));
  if (!offer || offer.status !== "active") notFound();
  if (offer.provider_id === user.id) redirect(`/offers/${offer.id}`);
  const balance = await getBalance(user.id);
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Book: {offer.skill_name}</h2>
      <p className="muted">
        Provider: {offer.provider_name} · {offer.duration_hours}h = {offer.duration_hours} credit(s) ·
        Your balance: {balance}
      </p>
      {balance < offer.duration_hours ? (
        <p className="error">
          You need {offer.duration_hours} credits but have {balance}. Earn credits by offering
          your own skills first (REQ-10).
        </p>
      ) : (
        <BookForm offerId={offer.id} credits={offer.duration_hours} />
      )}
    </div>
  );
}
