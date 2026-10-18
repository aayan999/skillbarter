import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "Step 1",
    title: "Post an offer or a request",
    body: "List what you can teach, or ask for what you want to learn. Categories keep browsing quick.",
  },
  {
    n: "Step 2",
    title: "Book a session",
    body: "Pick a time that works. New accounts get 2 credits; the session cost is reserved while it's on.",
  },
  {
    n: "Step 3",
    title: "Meet, chat, share files",
    body: "Every session has its own chat and a place for notes, code, or short videos - no need to swap numbers.",
  },
  {
    n: "Step 4",
    title: "Rate and move on",
    body: "When it's done, the credit transfers and both sides rate each other. Admins handle disputes.",
  },
];

const CATEGORIES = [
  { name: "Programming", eg: "Python, C++, web dev", tile: "lp-tile-1" },
  { name: "Design", eg: "Figma, posters, UI", tile: "lp-tile-2" },
  { name: "Academics", eg: "Math, physics, exam prep", tile: "lp-tile-3" },
  { name: "Communication", eg: "Public speaking, writing", tile: "lp-tile-4" },
  { name: "Productivity", eg: "Notion, Excel, planning", tile: "lp-tile-5" },
  { name: "General", eg: "Guitar, chess, anything else", tile: "lp-tile-6" },
];

const WHY = [
  {
    pill: "orange",
    label: "Time credits",
    body: "One hour taught is one credit earned. Everyone starts with two, and the ledger shows every move.",
    link: "/help",
    linkText: "How credits work",
  },
  {
    pill: "blue",
    label: "Offers & requests",
    body: "Offer your skills or request what you're stuck on - filter by category to find a match fast.",
    link: "/offers",
    linkText: "Browse offers",
  },
  {
    pill: "purple",
    label: "Session chat",
    body: "Plan the meetup in the built-in chat once your booking is accepted. No numbers exchanged.",
    link: "/help",
    linkText: "See a session",
  },
  {
    pill: "green",
    label: "Files & videos",
    body: "Share material up to 25 MB with your session partner. Only the two of you can open it.",
    link: "/help",
    linkText: "Sharing rules",
  },
  {
    pill: "pink",
    label: "Two-way ratings",
    body: "Both sides rate after a completed session, so reputations stay honest.",
    link: "/help",
    linkText: "Rating policy",
  },
  {
    pill: "grey",
    label: "Dispute handling",
    body: "If a session goes wrong, admins can warn the other side or reverse the credits.",
    link: "/help",
    linkText: "Raise a dispute",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero-text">
          <span className="lp-badge">For AISSMS IOIT students</span>
          <h1>
            You know something.
            <br />
            <span className="grad-text">Someone here wants to learn it.</span>
          </h1>
          <p className="lead">
            SkillBarter is a time-credit exchange for our campus. Teach an hour of Python,
            earn a credit. Spend it on an hour of guitar, UI design, or exam prep.{" "}
            <strong>No money changes hands - just hours.</strong>
          </p>
          <div className="lp-cta-row">
            <Link className="lp-btn" href="/register">
              Create your account <span aria-hidden="true">&#8599;</span>
            </Link>
            <Link className="lp-btn ghost" href="#how">
              See how it works <span aria-hidden="true">&#8595;</span>
            </Link>
          </div>
        </div>
        <div className="lp-hero-art">
          <img
            src="/screenshots/landing-dashboard.png"
            alt="The SkillBarter dashboard: credits available, reserved credits, active sessions and notifications"
          />
        </div>
      </section>

      <section className="lp-section" id="how">
        <h2 className="lp-h2">How it works</h2>
        <p className="lp-sub">
          Four steps from <strong>"I wish I knew that"</strong> to <strong>"now I do"</strong>.
        </p>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div className="lp-step" key={s.n}>
              <div className="n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">What people barter</h2>
        <p className="lp-sub">
          Six shelves, one campus. Every offer and request fits one of these.
        </p>
        <div className="lp-cats">
          {CATEGORIES.map((c) => (
            <div className="lp-cat" key={c.name}>
              <div className={`tile ${c.tile}`} aria-hidden="true">
                {c.name[0]}
              </div>
              <div className="body">
                <h3>{c.name}</h3>
                <p>{c.eg}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">But why SkillBarter?</h2>
        <p className="lp-sub">
          Because everyone on campus is good at something, and stuck on something else.
        </p>
        <div className="lp-bento">
          {WHY.map((w) => (
            <div className="lp-cell" key={w.label}>
              <span className={`lp-pill ${w.pill}`}>{w.label}</span>
              <p>{w.body}</p>
              <Link className="lp-link" href={w.link}>
                {w.linkText} <span aria-hidden="true">&#8594;</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">Take a look inside</h2>
        <p className="lp-sub">Real screens from the app, with demo data.</p>
        <div className="shots">
          <figure className="shot">
            <img
              src="/screenshots/landing-offers.png"
              alt="Skill offers page listing campus offers like Python for beginners, acoustic guitar basics, Figma UI crash course and linear algebra exam prep"
              loading="lazy"
            />
            <figcaption>Browse offers from students on campus, filtered by category.</figcaption>
          </figure>
          <figure className="shot">
            <img
              src="/screenshots/landing-session.png"
              alt="A session page for Python for beginners with the built-in chat between the two students and the file sharing panel"
              loading="lazy"
            />
            <figcaption>Every session has its own chat and file sharing, open to just the two of you.</figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-final">
        <h2>
          Your campus is full of teachers.
          <br />
          You just haven't met them yet.
        </h2>
        <p className="lp-sub">
          Create an account with your college ID and post your first offer in two minutes.
        </p>
        <div className="lp-cta-row">
          <Link className="lp-btn" href="/register">
            Create your account <span aria-hidden="true">&#8599;</span>
          </Link>
          <Link className="lp-btn ghost" href="/login">
            Log in
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div>
          <span className="brand">
            Skill<span className="grad-text">Barter</span>
          </span>
          <p className="lp-copy">
            A time-credit skill exchange, built as a campus project.
            <br />
            Registration needs your college ID.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link href="/offers">Offers</Link></li>
            <li><Link href="/requests">Requests</Link></li>
            <li><Link href="/sessions">Sessions</Link></li>
            <li><Link href="/help">Help</Link></li>
          </ul>
        </div>
        <div>
          <h4>Account</h4>
          <ul>
            <li><Link href="/login">Log in</Link></li>
            <li><Link href="/register">Create account</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
