import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSession } from "@/lib/services/bookings";
import DisputeForm from "@/components/DisputeForm";

export const dynamic = "force-dynamic";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const s = await getSession(Number(id));
  if (!s || (s.seeker_id !== user.id && s.provider_id !== user.id)) notFound();
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Report a dispute</h2>
      <p className="muted">
        Session: {s.skill_label} with {s.seeker_id === user.id ? s.provider_name : s.seeker_name}.
        The admin reviews reports and can reverse credits or warn the user involved (REQ-16, REQ-19).
      </p>
      <DisputeForm sessionId={s.id} />
    </div>
  );
}
