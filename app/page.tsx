import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="container">
      <section className="hero">
        <span className="hero-badge">For AISSMS IOIT students</span>
        <h1>
          You know something. Someone on campus <span className="grad-text">wants to learn it.</span>
        </h1>
        <p className="lead">
          SkillBarter is a time-credit exchange for our campus. Teach an hour of Python,
          earn a credit. Spend it on an hour of guitar, UI design, or exam prep.
          No money changes hands - just hours.
        </p>
        <div className="cta-row">
          <Link className="btn" href="/register">Create your account</Link>
          <Link className="btn secondary" href="/login">Log in</Link>
        </div>
      </section>

      <section>
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Four steps from "I wish I knew that" to "now I do".</p>
        <div className="steps">
          <div className="card step">
            <div className="step-num">1</div>
            <h3>Post an offer or a request</h3>
            <p>List what you can teach, or ask for what you want to learn. Categories keep browsing quick.</p>
          </div>
          <div className="card step">
            <div className="step-num">2</div>
            <h3>Book a session</h3>
            <p>Pick a time that works. New accounts get 2 credits; the session cost is reserved while it's on.</p>
          </div>
          <div className="card step">
            <div className="step-num">3</div>
            <h3>Meet, chat, share files</h3>
            <p>Every session has its own chat and a place for notes, code, or short videos - no need to swap numbers.</p>
          </div>
          <div className="card step">
            <div className="step-num">4</div>
            <h3>Rate and move on</h3>
            <p>When it's done, the credit transfers and both sides rate each other. Admins handle disputes.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">What's inside</h2>
        <p className="section-sub">The features you'll actually use, nothing else.</p>
        <div className="feature-grid">
          <div className="card">
            <h3>Time credits, not money</h3>
            <p>One hour taught is one credit earned. Everyone starts with two, and the ledger shows every move.</p>
          </div>
          <div className="card">
            <h3>Offers and requests</h3>
            <p>Offer your skills or request what you're stuck on - filter by category to find a match fast.</p>
          </div>
          <div className="card">
            <h3>Session chat</h3>
            <p>Plan the meetup in the built-in chat once your booking is accepted.</p>
          </div>
          <div className="card">
            <h3>Files and videos</h3>
            <p>Share material up to 25 MB with your session partner. Only the two of you can open it.</p>
          </div>
          <div className="card">
            <h3>Two-way ratings</h3>
            <p>Both sides rate after a completed session, so reputations stay honest.</p>
          </div>
          <div className="card">
            <h3>Dispute handling</h3>
            <p>If a session goes wrong, admins can warn the other side or reverse the credits.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Take a look inside</h2>
        <p className="section-sub">Real screens from the app, with demo data.</p>
        <div className="shots">
          <figure className="shot">
            <img src="/screenshots/landing-offers.png" alt="Skill offers page listing campus offers like Python for beginners, acoustic guitar basics, Figma UI crash course and linear algebra exam prep" loading="lazy" />
            <figcaption>Browse offers from students on campus, filtered by category.</figcaption>
          </figure>
          <figure className="shot">
            <img src="/screenshots/landing-dashboard.png" alt="Dashboard showing credits available, reserved credits, active sessions and notifications" loading="lazy" />
            <figcaption>Your dashboard: credits, sessions and notifications in one place.</figcaption>
          </figure>
          <figure className="shot">
            <img src="/screenshots/landing-session.png" alt="A session page for Python for beginners with the built-in chat between the two students and the file sharing panel" loading="lazy" />
            <figcaption>Every session has its own chat and file sharing, open to just the two of you.</figcaption>
          </figure>
        </div>
      </section>

      <p className="landing-foot">
        SkillBarter is a campus project. Registration needs your college ID.
      </p>
    </main>
  );
}
