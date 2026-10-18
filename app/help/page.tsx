// SRS 2.6: simple in-app help/FAQ page.
export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Help &amp; FAQ</h2>
      <h3>What is SkillBarter?</h3>
      <p>
        SkillBarter lets students swap practical skills using time credits instead of money.
        One hour of help equals one time credit.
      </p>
      <h3>How do credits work?</h3>
      <p>
        You start with 2 free credits. When a provider accepts your booking, the credits are
        reserved; when the session is marked complete, they transfer to the provider. If an
        accepted booking is cancelled, the reservation is released. Your balance can never go
        below zero.
      </p>
      <h3>How do I earn credits?</h3>
      <p>Post a skill offer, accept bookings, and complete sessions.</p>
      <h3>When does chat open?</h3>
      <p>
        Chat and file/video sharing unlock only after the provider accepts your booking.
        Only the two participants can see them.
      </p>
      <h3>Something went wrong in a session.</h3>
      <p>
        Open the session and use "Report a dispute". The admin reviews it and can reverse the
        credits or warn the user involved.
      </p>
    </div>
  );
}
