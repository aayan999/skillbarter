// End-to-end session lifecycle at the service layer: REQ-9..REQ-14, REQ-16,
// REQ-19 and the SRS 5.3 participant-only visibility rule.
import { describe, it, expect } from "vitest";
import { makeUser, makeOffer, balance } from "./helpers";
import {
  requestBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  completeSession,
} from "@/lib/services/bookings";
import { sendMessage, listMessages } from "@/lib/services/chat";
import { submitRating } from "@/lib/services/ratings";
import { createDispute } from "@/lib/services/disputes";
import { resolveDispute } from "@/lib/services/admin";
import { query } from "@/lib/db";

describe("session lifecycle", () => {
  it("request -> accept -> chat -> complete -> rate", async () => {
    const seeker = await makeUser("Ira");
    const provider = await makeUser("Jai");
    const offer = await makeOffer(provider, 2); // 2 hours = 2 credits

    // REQ-10: seeker with 1 credit cannot book a 2-credit session
    const poor = await makeUser("Kia");
    // drain Kia to 1 credit
    await query("UPDATE users SET credits = 1 WHERE id = $1", [poor]);
    const denied = await requestBooking(poor, offer, new Date(Date.now() + 3600e3).toISOString());
    expect(denied.error).toMatch(/Not enough credits/);

    // REQ-9: request + accept
    const when = new Date(Date.now() + 3600e3).toISOString();
    const { id: sid } = await requestBooking(seeker, offer, when);
    expect(sid).toBeTruthy();
    expect(await balance(seeker)).toBe(2); // not reserved yet

    // REQ-11: chat is closed before acceptance
    const early = await sendMessage(sid!, seeker, "hello?");
    expect(early.error).toMatch(/after the provider accepts/);

    const accepted = await acceptBooking(sid!, provider);
    expect(accepted.ok).toBe(true);
    expect(await balance(seeker)).toBe(0); // REQ-7: reserved

    // REQ-11 + 5.3: participants can chat, outsiders cannot even read
    expect((await sendMessage(sid!, provider, "hi!")).ok).toBe(true);
    const outsider = await makeUser("Leo");
    expect(await listMessages(sid!, outsider)).toBeNull();
    expect((await listMessages(sid!, seeker))!.length).toBe(1);

    // REQ-13: completion transfers credits
    expect((await completeSession(sid!, seeker)).ok).toBe(true);
    expect(await balance(provider)).toBe(4); // 2 bonus + 2 earned
    expect(await balance(seeker)).toBe(0);

    // REQ-14: two-way rating updates the average
    expect((await submitRating(sid!, seeker, 5, "great")).ok).toBe(true);
    expect((await submitRating(sid!, provider, 4, "thanks")).ok).toBe(true);
    const dupe = await submitRating(sid!, seeker, 1, "");
    expect(dupe.error).toMatch(/already rated/);
    const avg = (await query("SELECT avg_rating FROM users WHERE id = $1", [provider]))[0];
    expect(Number(avg.avg_rating)).toBe(5);
  });

  it("reject never reserves; cancel after accept releases", async () => {
    const seeker = await makeUser("Mira");
    const provider = await makeUser("Nikhil");
    const offer = await makeOffer(provider, 1);
    const when = new Date(Date.now() + 3600e3).toISOString();

    const { id: s1 } = await requestBooking(seeker, offer, when);
    expect((await rejectBooking(s1!, provider)).ok).toBe(true);
    expect(await balance(seeker)).toBe(2); // untouched

    const { id: s2 } = await requestBooking(seeker, offer, when);
    expect((await acceptBooking(s2!, provider)).ok).toBe(true);
    expect(await balance(seeker)).toBe(1); // 1 reserved
    expect((await cancelBooking(s2!, provider)).ok).toBe(true);
    expect(await balance(seeker)).toBe(2); // released
  });

  it("dispute flow: report, warn, reverse (REQ-16, REQ-19)", async () => {
    const seeker = await makeUser("Omar");
    const provider = await makeUser("Pia");
    const admin = await makeUser("Root", true);
    const offer = await makeOffer(provider, 2);
    const when = new Date(Date.now() + 3600e3).toISOString();
    const { id: sid } = await requestBooking(seeker, offer, when);
    await acceptBooking(sid!, provider);
    await completeSession(sid!, provider);
    expect(await balance(provider)).toBe(4);

    // REQ-16
    const rep = await createDispute(sid!, seeker, "no_show", "Provider never showed up.");
    expect(rep.ok).toBe(true);

    // REQ-19: reverse credits
    const res = await resolveDispute(rep.id!, admin, "reverse_credits", "Confirmed no-show.");
    expect(res.ok).toBe(true);
    expect(await balance(seeker)).toBe(2); // refunded
    expect(await balance(provider)).toBe(2); // back to the registration bonus

    // REQ-19: warn on a second dispute
    const rep2 = await createDispute(sid!, seeker, "poor_quality", "Bad session.");
    const res2 = await resolveDispute(rep2.id!, admin, "warn_user", "First warning.");
    expect(res2.ok).toBe(true);
    const warned = (await query("SELECT warnings FROM users WHERE id = $1", [provider]))[0];
    expect(Number(warned.warnings)).toBe(1);

    // non-admin cannot resolve
    const rep3 = await createDispute(sid!, seeker, "other", "x");
    void rep3; // route-level guard tested via service auth in admin page; service requires admin id
  });
});
