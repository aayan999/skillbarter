import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import RegisterForm from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="card" style={{ maxWidth: 480, margin: "2rem auto" }}>
      <h2>Join SkillBarter</h2>
      <p className="muted">Register with your college email and ID (REQ-1).</p>
      <RegisterForm />
    </div>
  );
}
