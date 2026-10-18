// Edge cases: transitions, permissions, validation, chat, uploads, credits.
import { describe, it, expect } from "vitest";
import { makeUser, makeOffer, balance } from "./helpers";
import {
  requestBooking, acceptBooking, rejectBooking, cancelBooking, completeSession,
} from "@/lib/services/bookings";
import { sendMessage, listMessages } from "@/lib/services/chat";
import { submitRating } from "@/lib/services/ratings";
import { createDispute } from "@/lib/services/disputes";
import { resolveDispute } from "@/lib/services/admin";
import { sanitizeFileName } from "@/lib/services/resources";
import { query } from "@/lib/db";

const future = () => new Date(Date.now() + 3600e3).toISOString();
async function acceptedSession(hours = 1) {
  const seeker = await makeUser("S" + Math.random().toString(36).slice(2, 6));
  const provider = await makeUser("P" + Math.random().toString(36).slice(2, 6));
  const offer = await makeOffer(provider, hours);
  const { id: sid } = await requestBooking(seeker, offer, future());
  await acceptBooking(sid!, provider);
  return { seeker, provider, offer, sid: sid! };
}

describe("session state transitions", () => {
  it("rejects invalid and repeated transitions", async () => {
    // complete before accept
    const seeker = await makeUser("Tr1");
    const provider = await makeUser("Tr2");
    const offer = await makeOffer(provider, 1);
    const { id: sid } = await requestBooking(seeker, offer, future());
    expect((await completeSession(sid!, provider)).error).toMatch(/Cannot complete/);
    // accept twice: second fails and credits are NOT reserved twice
    expect((await acceptBooking(sid!, provider)).ok).toBe(true);
    expect(await balance(seeker)).toBe(1);
    expect((await acceptBooking(sid!, provider)).error).toMatch(/already accepted/);
    expect(await balance(seeker)).toBe(1);
    // reject after accept
    expect((await rejectBooking(sid!, provider)).error).toMatch(/already accepted/);
    // complete twice: second fails, provider not paid twice
    expect((await completeSession(sid!, provider)).ok).toBe(true);
    const paid = await balance(provider);
    expect((await completeSession(sid!, provider)).error).toMatch(/Cannot complete/);
    expect(await balance(provider)).toBe(paid);
    // cancel after completion
    expect((await cancelBooking(sid!, provider)).error).toMatch(/Cannot cancel/);
  });

  it("both-party completion: seeker can complete, then provider cannot re-complete", async () => {
    const { seeker, provider, sid } = await acceptedSession();
    expect((await completeSession(sid, seeker)).ok).toBe(true);
    expect((await completeSession(sid, provider)).error).toBeTruthy();
  });

  it("cancel of a requested (never accepted) session moves no credits", async () => {
    const seeker = await makeUser("Can1");
    const provider = await makeUser("Can2");
    const offer = await makeOffer(provider, 1);
    const { id: sid } = await requestBooking(seeker, offer, future());
    expect((await cancelBooking(sid!, seeker)).ok).toBe(true);
    expect(await balance(seeker)).toBe(2);
  });

  it("booking guards: own offer, past date, tampered ids", async () => {
    const provider = await makeUser("Own1");
    const offer = await makeOffer(provider, 1);
    expect((await requestBooking(provider, offer, future())).error).toMatch(/own offer/);
    const other = await makeUser("Own3");
    expect((await requestBooking(other, offer, new Date(Date.now() - 3600e3).toISOString())).error).toMatch(/future/);
    const stranger = await makeUser("Own2");
    expect((await acceptBooking(99999, provider)).error).toMatch(/not found/);
    expect((await sendMessage(99999, stranger, "hi")).error).toMatch(/not found/);
  });
});

describe("permissions", () => {
  it("cross-user actions are blocked", async () => {
    const { sid } = await acceptedSession();
    const outsider = await makeUser("Out1");
    expect((await cancelBooking(sid, outsider)).error).toMatch(/not found/);
    expect((await acceptBooking(sid, outsider)).error).toMatch(/not found/);
    expect((await completeSession(sid, outsider)).error).toMatch(/not found/);
    expect((await createDispute(sid, outsider, "other", "x")).error).toMatch(/not found/);
    expect(await listMessages(sid, outsider)).toBeNull();
  });

  it("dispute resolution errors: unknown dispute, reverse on non-completed", async () => {
    const admin = await makeUser("Adm1", true);
    expect((await resolveDispute(99999, admin, "dismiss", "")).error).toMatch(/not found/);
    const { seeker, sid } = await acceptedSession();
    const rep = await createDispute(sid, seeker, "other", "x");
    expect((await resolveDispute(rep.id!, admin, "reverse_credits", "")).error).toMatch(/completed sessions/);
    // resolving twice
    expect((await resolveDispute(rep.id!, admin, "dismiss", "no action")).ok).toBe(true);
    expect((await resolveDispute(rep.id!, admin, "dismiss", "again")).error).toMatch(/Already resolved/);
  });
});

describe("ratings rules", () => {
  it("no rating before completion; score bounds enforced", async () => {
    const { seeker, provider, sid } = await acceptedSession();
    expect((await submitRating(sid, seeker, 5, "")).error).toMatch(/after the session is completed/);
    await completeSession(sid, provider);
    expect((await submitRating(sid, seeker, 0, "")).error).toMatch(/1-5/);
    expect((await submitRating(sid, seeker, 6, "")).error).toMatch(/1-5/);
    const outsider = await makeUser("Out2");
    expect((await submitRating(sid, outsider, 5, "")).error).toMatch(/not found/);
  });
});

describe("chat edge cases", () => {
  it("empty and over-long messages rejected; rapid messages stored in order", async () => {
    const { seeker, provider, sid } = await acceptedSession();
    expect((await sendMessage(sid, seeker, "   ")).error).toMatch(/Empty/);
    expect((await sendMessage(sid, seeker, "x".repeat(2001))).error).toMatch(/too long/);
    expect((await sendMessage(sid, seeker, "x".repeat(2000))).ok).toBe(true);
    for (let i = 1; i <= 30; i++) await sendMessage(sid, i % 2 ? seeker : provider, `msg ${i}`);
    const msgs = await listMessages(sid, seeker);
    expect(msgs!.length).toBe(31); // 30 + the 2000-char one
    expect(msgs![1].content).toBe("msg 1");
    expect(msgs![30].content).toBe("msg 30");
    // unicode roundtrip
    await sendMessage(sid, seeker, "नमस्ते 👋 ñoño <b>not html?</b>");
    const m2 = await listMessages(sid, seeker);
    expect(m2![m2!.length - 1].content).toBe("नमस्ते 👋 ñoño <b>not html?</b>");
  });
});

describe("credits: draining and double-spend protection", () => {
  it("three sequential bookings against 2 credits: third cannot be accepted", async () => {
    const seeker = await makeUser("Dr1");
    const provider = await makeUser("Dr2");
    const offer = await makeOffer(provider, 1);
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await requestBooking(seeker, offer, future());
      ids.push(r.id!);
    }
    expect((await acceptBooking(ids[0], provider)).ok).toBe(true);
    expect((await acceptBooking(ids[1], provider)).ok).toBe(true);
    expect(await balance(seeker)).toBe(0);
    await expect(acceptBooking(ids[2], provider)).rejects.toThrow();
    expect(await balance(seeker)).toBe(0); // unchanged, state rolled back
    const s3 = (await query("SELECT status FROM sessions WHERE id = $1", [ids[2]]))[0];
    expect(s3.status).toBe("requested"); // not left half-accepted
  });
});

describe("upload filename sanitization", () => {
  it("strips traversal and unsafe chars", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("..\\..\\win.ini")).toBe("win.ini");
    expect(sanitizeFileName("my notes (final v2).pdf")).toBe("my_notes__final_v2_.pdf");
    expect(sanitizeFileName("नोट्स.txt")).toBe("_____.txt"); // one _ per non-ASCII char
    expect(sanitizeFileName("")).toBe("upload");
    expect(sanitizeFileName("a".repeat(200) + ".png").length).toBeLessThanOrEqual(120);
  });
});

describe("category filters", () => {
  it("case-insensitive offer and request filtering", async () => {
    const { listOffers, listRequests } = await import("@/lib/services/offers");
    const u = await makeUser("Cat1");
    await makeOffer(u, 1); // category from helper
    const offersAny = await listOffers();
    const cat = (offersAny[0] as any).category as string;
    const upper = await listOffers(cat.toUpperCase());
    const lower = await listOffers(cat.toLowerCase());
    expect(upper.length).toBeGreaterThan(0);
    expect(lower.length).toBe(upper.length);
    const reqsLower = await listRequests(cat.toLowerCase());
    expect(Array.isArray(reqsLower)).toBe(true);
  });
});
