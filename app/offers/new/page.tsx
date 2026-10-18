import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import OfferForm from "@/components/OfferForm";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  if (!(await getSessionUser())) redirect("/login");
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Post a skill offer</h2>
      <p className="muted">You earn the session credits when the session is completed (REQ-3, REQ-7).</p>
      <OfferForm />
    </div>
  );
}
