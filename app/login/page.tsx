import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="card" style={{ maxWidth: 480, margin: "2rem auto" }}>
      <h2>Log in</h2>
      <LoginForm />
    </div>
  );
}
