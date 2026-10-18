// Feature coverage for REQ-2, REQ-4, REQ-5, REQ-12, REQ-17, REQ-18 at the
// service layer (the same functions the pages/routes call).
import { describe, it, expect } from "vitest";
import { makeUser, makeOffer, balance } from "./helpers";
import { createRequest, listRequests, closeRequest, listOffers, createOffer } from "@/lib/services/offers";
import { createResource, listResources, getResource, sharingOpen } from "@/lib/services/resources";
import { requestBooking, acceptBooking } from "@/lib/services/bookings";
import { adminOverview, adminListUsers, adminListSessions, adminListDisputes } from "@/lib/services/admin";
import { createDispute } from "@/lib/services/disputes";
import { getBalance, getReserved } from "@/lib/services/wallet";
import { query } from "@/lib/db";

describe("REQ-4/REQ-5: requests and categorized listings", () => {
  it("creates, lists, filters and closes requests", async () => {
    const seeker = await makeUser("Quinn");
    await createRequest(seeker, "Resume review", "Communication", "Need feedback");
    await createRequest(seeker, "Excel macros", "Productivity", "Automate a sheet");
    expect((await listRequests()).length).toBe(2);
    const comm = await listRequests("Communication");
    expect(comm.length).toBe(1);
    expect(comm[0].skill_needed).toBe("Resume review");
    // close: only the owner can close
    const other = await makeUser("Ria");
    expect(await closeRequest(comm[0].id, other)).toBe(false);
    expect(await closeRequest(comm[0].id, seeker)).toBe(true);
    expect((await listRequests()).length).toBe(1);
    expect((await listRequests("Communication")).length).toBe(0);
  });

  it("filters offers by category and hides deactivated ones", async () => {
    const provider = await makeUser("Sara");
    await createOffer(provider, "Python tutoring", "Programming", "", 1);
    await createOffer(provider, "Poster design", "Design", "", 2);
    expect((await listOffers()).length).toBe(2);
    expect((await listOffers("Design"))[0].skill_name).toBe("Poster design");
    const rows = await query("SELECT id FROM skill_offers WHERE skill_name = 'Python tutoring'");
    await query("UPDATE skill_offers SET status = 'deactivated' WHERE id = $1", [rows[0].id]);
    expect((await listOffers()).length).toBe(1);
  });
});

describe("REQ-2: profile skills list", () => {
  it("returns the offers that back the profile page", async () => {
    const provider = await makeUser("Tara");
    await makeOffer(provider, 1);
    await makeOffer(provider, 2);
    const offers = await query(
      "SELECT id, skill_name FROM skill_offers WHERE provider_id = $1",
      [provider]
    );
    expect(offers.length).toBe(2);
  });
});

describe("REQ-12: session resources (files and videos)", () => {
  it("sharing follows the same rules as chat", async () => {
    const seeker = await makeUser("Uma");
    const provider = await makeUser("Vikram");
    const outsider = await makeUser("Wendy");
    const offer = await makeOffer(provider, 1);
    const { id: sid } = await requestBooking(seeker, offer, new Date(Date.now() + 3600e3).toISOString());
    // not open before acceptance
    expect(await sharingOpen(sid!, seeker)).toBe(false);
    await acceptBooking(sid!, provider);
    expect(await sharingOpen(sid!, seeker)).toBe(true);
    // create + list as participant
    const rid = await createResource(sid!, provider, "video", "explain.mp4", 1024);
    const list = await listResources(sid!, seeker);
    expect(list!.length).toBe(1);
    expect(list![0].file_type).toBe("video");
    // participant can fetch; outsider gets null (SRS 5.3)
    expect((await getResource(sid!, rid, seeker))!.file_name).toBe("explain.mp4");
    expect(await getResource(sid!, rid, outsider)).toBeNull();
    expect(await listResources(sid!, outsider)).toBeNull();
  });
});

describe("REQ-17/REQ-18: dashboard data", () => {
  it("user dashboard numbers match the wallet", async () => {
    const seeker = await makeUser("Xena");
    const provider = await makeUser("Yusuf");
    const offer = await makeOffer(provider, 2);
    const { id: sid } = await requestBooking(seeker, offer, new Date(Date.now() + 3600e3).toISOString());
    await acceptBooking(sid!, provider);
    expect(await getBalance(seeker)).toBe(0);
    expect(await getReserved(seeker)).toBe(2); // reserved shows on dashboard
    expect(await getBalance(provider)).toBe(2);
  });

  it("admin overview counts users, sessions, disputes, credits", async () => {
    const before = await adminOverview();
    const a = await makeUser("Zack");
    const b = await makeUser("Amy");
    const offer = await makeOffer(b, 1);
    const { id: sid } = await requestBooking(a, offer, new Date(Date.now() + 3600e3).toISOString());
    await acceptBooking(sid!, b);
    await createDispute(sid!, a, "other", "test");
    const stats = await adminOverview();
    expect(stats.users).toBe(before.users + 2);
    expect(stats.sessions).toBe(before.sessions + 1);
    expect(stats.openDisputes).toBe(before.openDisputes + 1);
    expect(stats.sessionsByStatus.accepted).toBe((before.sessionsByStatus.accepted || 0) + 1);
    expect((await adminListUsers()).length).toBe(stats.users);
    expect((await adminListSessions()).some((s: any) => s.id === sid)).toBe(true);
    expect((await adminListDisputes()).some((d: any) => d.session_id === sid)).toBe(true);
  });
});
