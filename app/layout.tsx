import "./globals.css";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getBalance } from "@/lib/services/wallet";

export const metadata = {
  title: "SkillBarter",
  description: "A time-credit based peer skill exchange platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const credits = user ? await getBalance(user.id) : null;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            Skill<span>Barter</span>
          </Link>
          {user ? (
            <>
              <nav>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/offers">Offers</Link>
                <Link href="/requests">Requests</Link>
                <Link href="/sessions">Sessions</Link>
                <Link href="/profile">Profile</Link>
                <Link href="/help">Help</Link>
                {user.isAdmin ? <Link href="/admin">Admin</Link> : null}
              </nav>
              <div className="spacer" />
              <span className="badge">Credits: {credits}</span>
              <span className="muted small">{user.name}</span>
              <form action="/api/auth/logout" method="post" style={{ margin: 0 }}>
                <button className="secondary" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="spacer" />
              <nav>
                <Link href="/login">Log in</Link>
                <Link className="lp-nav-btn" href="/register">Register</Link>
              </nav>
            </>
          )}
        </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
