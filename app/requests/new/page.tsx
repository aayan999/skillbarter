import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import RequestForm from "@/components/RequestForm";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  if (!(await getSessionUser())) redirect("/login");
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Post a skill request</h2>
      <p className="muted">Tell others what you need help with (REQ-4).</p>
      <RequestForm />
    </div>
  );
}
