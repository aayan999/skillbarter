// Wallet rules: REQ-6 (2 free credits), REQ-7 (reserve/transfer/release),
// REQ-8 (never negative), REQ-19 (admin reversal).
import { describe, it, expect } from "vitest";
import { makeUser, balance, txCount } from "./helpers";
import {
  reserveCredits,
  releaseCredits,
  transferCredits,
  adminReverseCredits,
  InsufficientCreditsError,
} from "@/lib/services/wallet";

describe("time-credit wallet", () => {
  it("grants 2 free credits at registration (REQ-6)", async () => {
    const u = await makeUser("Asha");
    expect(await balance(u)).toBe(2);
    expect(await txCount(u)).toBe(1);
  });

  it("reserves on acceptance and rejects over-spend (REQ-7, REQ-8)", async () => {
    const u = await makeUser("Bala");
    await reserveCredits(u, null, 2);
    expect(await balance(u)).toBe(0);
    await expect(reserveCredits(u, null, 1)).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await balance(u)).toBe(0); // unchanged after failed reservation
  });

  it("never lets a balance go negative (REQ-8)", async () => {
    const u = await makeUser("Chin");
    await expect(reserveCredits(u, null, 5)).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await balance(u)).toBe(2);
  });

  it("releases the reservation on cancellation", async () => {
    const u = await makeUser("Dev");
    await reserveCredits(u, null, 2);
    await releaseCredits(u, null, 2);
    expect(await balance(u)).toBe(2);
  });

  it("transfers credits to the provider on completion (REQ-7)", async () => {
    const seeker = await makeUser("Esha");
    const provider = await makeUser("Farid");
    await reserveCredits(seeker, null, 2);
    await transferCredits(provider, null, 2);
    expect(await balance(seeker)).toBe(0);
    expect(await balance(provider)).toBe(4); // 2 bonus + 2 earned
  });

  it("admin reversal moves credits back, never below zero (REQ-19 + REQ-8)", async () => {
    const seeker = await makeUser("Gita");
    const provider = await makeUser("Hari");
    // full reversal
    let moved = await adminReverseCredits(provider, seeker, null, 2);
    expect(moved).toBe(2);
    expect(await balance(provider)).toBe(0);
    expect(await balance(seeker)).toBe(4);
    // partial reversal: provider has 0 left, cannot go negative
    moved = await adminReverseCredits(provider, seeker, null, 3);
    expect(moved).toBe(0);
    expect(await balance(provider)).toBe(0);
    expect(await balance(seeker)).toBe(4);
  });
});
