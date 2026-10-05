import { describe, expect, it } from "vitest";
import {
  EXIT_FEE, EXIT_FORFEIT, HOLD_FACTOR, LOCK_MAX, LOCK_START, LOCK_STEP, LOCK_TICKET_LOCKS, MATURITY_ROUNDS, STAKE_GOLD_CAP,
  STAKE_MAX, STAKE_STEP,
} from "./config";
import { CLASS_IDS, RARITIES, heroPerks, scalePerks, type HeroNft } from "./catalog";
import {
  STAKE_LOCK_KEY, addToStake, exitTerms, isMature, lockFactor, passiveGold, settleLocks, stakeGoldPct, strength, tenure,
  type Lock,
} from "./locks";

const lock = (over: Partial<Lock> = {}): Lock => ({ key: "hero:a", kind: "hero", since: 1, value: 600, farmed: 0, dust: 0, ...over });

describe("lock strength", () => {
  it("starts below full strength, grows a step per closed round and stops at the cap", () => {
    expect(lockFactor(0)).toBe(LOCK_START);
    expect(lockFactor(1)).toBeCloseTo(LOCK_START + LOCK_STEP, 10);
    expect(lockFactor(MATURITY_ROUNDS)).toBe(1);
    expect(lockFactor(10)).toBe(LOCK_MAX);
    expect(lockFactor(500)).toBe(LOCK_MAX);
    expect(lockFactor(-3)).toBe(LOCK_START);
  });

  it("makes a fresh lock stronger than merely holding, and a long lock stronger still", () => {
    expect(strength(undefined, 5)).toBe(HOLD_FACTOR);
    expect(LOCK_START).toBeGreaterThan(HOLD_FACTOR);
    const opened = lock({ since: 5 });
    expect(strength(opened, 5)).toBe(LOCK_START);
    expect(strength(opened, 5 + 6)).toBeGreaterThan(strength(opened, 5 + 2));
    expect(strength(opened, 5 + 40)).toBe(LOCK_MAX);
  });

  it("counts age in closed rounds and matures after MATURITY_ROUNDS", () => {
    const l = lock({ since: 3 });
    expect(tenure(l, 3)).toBe(0);
    expect(tenure(l, 2)).toBe(0);
    expect(isMature(l, 3 + MATURITY_ROUNDS - 1)).toBe(false);
    expect(isMature(l, 3 + MATURITY_ROUNDS)).toBe(true);
  });
});

describe("scaling perks", () => {
  it("rounds counts, rounds a light radius down and shortens regrowth as the perk strengthens", () => {
    expect(scalePerks({ goldPct: 20 }, HOLD_FACTOR).goldPct).toBe(12);
    expect(scalePerks({ stepDiscount: 0.35 }, HOLD_FACTOR).stepDiscount).toBeCloseTo(0.21, 10);
    expect(scalePerks({ radius: 1 }, HOLD_FACTOR).radius).toBe(0);
    expect(scalePerks({ radius: 1 }, 1).radius).toBe(1);
    expect(scalePerks({ radius: 2 }, HOLD_FACTOR).radius).toBe(1);
    expect(scalePerks({ radius: 2 }, LOCK_MAX).radius).toBe(2);
    expect(scalePerks({ regenEvery: 8 }, HOLD_FACTOR).regenEvery).toBeGreaterThan(8);
    expect(scalePerks({ regenEvery: 8 }, LOCK_MAX).regenEvery).toBeLessThan(8);
    expect(scalePerks({ stealth: true }, HOLD_FACTOR).stealth).toBe(true);
  });

  it("never makes a held perk stronger than a full one, or a full one stronger than a maxed lock", () => {
    const sources: Partial<ReturnType<typeof heroPerks>>[] = [];
    for (const classId of CLASS_IDS) {
      for (const rarity of RARITIES) {
        const hero: HeroNft = { id: "x", serial: 1, classId, rarity, source: "altar", mintedAt: 0 };
        sources.push(heroPerks(hero));
      }
    }
    for (const perks of sources) {
      const held = scalePerks(perks, HOLD_FACTOR), full = scalePerks(perks, 1), maxed = scalePerks(perks, LOCK_MAX);
      for (const key of ["goldPct", "crystalPct", "findPct", "startLight", "damage", "stepDiscount", "drainReduce", "freeStepChance", "radius"] as const) {
        expect(held[key] ?? 0).toBeLessThanOrEqual(full[key] ?? 0);
        expect(full[key] ?? 0).toBeLessThanOrEqual(maxed[key] ?? 0);
      }
      // A smaller number is a stronger regrowth, so the ordering runs the other way round.
      if (perks.regenEvery) {
        expect(held.regenEvery!).toBeGreaterThanOrEqual(full.regenEvery!);
        expect(full.regenEvery!).toBeGreaterThanOrEqual(maxed.regenEvery!);
      }
    }
  });
});

describe("staking", () => {
  it("adds gold in steps up to a cap, and more as the stake ages", () => {
    const stake = (value: number, since = 1) => lock({ key: STAKE_LOCK_KEY, kind: "stake", value, since });
    expect(stakeGoldPct(undefined, 1)).toBe(0);
    expect(stakeGoldPct(lock(), 1)).toBe(0);
    expect(stakeGoldPct(stake(STAKE_STEP), 1)).toBeGreaterThanOrEqual(1);
    expect(stakeGoldPct(stake(STAKE_MAX), 1)).toBeLessThanOrEqual(Math.round(STAKE_GOLD_CAP * LOCK_START) + 1);
    expect(stakeGoldPct(stake(STAKE_MAX), 20)).toBe(Math.round(STAKE_GOLD_CAP * LOCK_MAX));
    expect(stakeGoldPct(stake(STAKE_MAX), 20)).toBeGreaterThan(stakeGoldPct(stake(STAKE_MAX), 1));
  });

  it("only takes whole steps up to the cap and keeps an averaged age when topped up", () => {
    expect(() => addToStake(undefined, 0, 1)).toThrow();
    expect(() => addToStake(undefined, STAKE_STEP + 1, 1)).toThrow();
    expect(() => addToStake(undefined, STAKE_MAX + STAKE_STEP, 1)).toThrow();
    const first = addToStake(undefined, STAKE_STEP, 1);
    expect(first).toMatchObject({ key: STAKE_LOCK_KEY, kind: "stake", value: STAKE_STEP, since: 1 });
    // $5 aged 10 rounds joined by $5 fresh is, on average, 5 rounds old.
    const topped = addToStake(first, STAKE_STEP, 11);
    expect(topped.value).toBe(2 * STAKE_STEP);
    expect(tenure(topped, 11)).toBe(5);
    expect(() => addToStake(addToStake(undefined, STAKE_MAX, 1), STAKE_STEP, 1)).toThrow();
  });
});

describe("sharing the lock pool", () => {
  const pot = 1_400;

  it("pays out no more than the pool holds, whoever locks", () => {
    for (const fieldGold of [0, 10, 8_000, 1_000_000]) {
      for (const locks of [[], [lock()], [lock(), lock({ key: "hero:b", value: 1_500, since: 3 }), lock({ key: STAKE_LOCK_KEY, kind: "stake", value: 500 })]]) {
        const r = settleLocks(locks, 6, pot, fieldGold);
        const paid = Object.values(r.payouts).reduce((a, b) => a + b, 0);
        expect(paid + r.fieldPayout + r.carry).toBeCloseTo(pot, 6);
        expect(r.carry).toBeGreaterThanOrEqual(0);
        // Only crumbs are left over, unless nobody has any passive gold at all (then the whole pool waits a round).
        if (fieldGold > 0 || locks.length > 0) expect(r.carry).toBeLessThan(0.05);
      }
    }
  });

  it("shares by passive gold: more value and more age take more of the pool", () => {
    const small = lock({ key: "hero:small", value: 100 });
    const big = lock({ key: "hero:big", value: 1_500 });
    const r = settleLocks([small, big], 1, pot, 8_000);
    expect(r.payouts["hero:big"]).toBeGreaterThan(r.payouts["hero:small"]);
    const young = lock({ key: "hero:young", since: 9 });
    const old = lock({ key: "hero:old", since: 1 });
    const aged = settleLocks([young, old], 9, pot, 8_000);
    expect(passiveGold(old, 9)).toBeGreaterThan(passiveGold(young, 9));
    expect(aged.payouts["hero:old"]).toBeGreaterThan(aged.payouts["hero:young"]);
  });

  it("gives the whole pool to the crowd when you lock nothing, and never pays a lock that is paused", () => {
    const none = settleLocks([], 1, pot, 8_000);
    expect(none.yourGold).toBe(0);
    expect(none.fieldPayout).toBeCloseTo(pot, 1);
    const resting = lock({ key: "hero:resting", value: 500 });
    const paused = settleLocks([resting], 1, pot, 8_000, () => false);
    expect(paused.payouts).toEqual({});
    expect(paused.locks[0].farmed).toBe(0);
    expect(paused.locks[0].dust).toBe(0);
  });

  it("carries the pool over when nobody has any passive gold", () => {
    const r = settleLocks([], 1, pot, 0);
    expect(r.carry).toBe(pot);
    expect(r.fieldPayout).toBe(0);
  });

  it("adds what a lock farms to its balance without touching anyone else's", () => {
    const a = lock({ key: "hero:a", farmed: 5 });
    const b = lock({ key: "hero:b", farmed: 7 });
    const r = settleLocks([a, b], 2, pot, 8_000);
    expect(r.locks[0].farmed).toBeCloseTo(5 + r.payouts["hero:a"], 6);
    expect(r.locks[1].farmed).toBeCloseTo(7 + r.payouts["hero:b"], 6);
  });

  it("hands out a few raffle tickets slowly, only for the first NFT locks and never for a stake", () => {
    let locks: Lock[] = [
      lock({ key: "hero:a", since: 1 }), lock({ key: "hero:b", since: 2 }), lock({ key: "hero:c", since: 3 }),
      lock({ key: STAKE_LOCK_KEY, kind: "stake", value: 1_000, since: 1 }),
    ];
    let tickets = 0;
    for (let round = 3; round < 3 + MATURITY_ROUNDS; round++) {
      const r = settleLocks(locks, round, pot, 8_000);
      locks = r.locks;
      tickets += r.tickets;
      // Nothing is handed over in the first three rounds.
      if (round < 3 + MATURITY_ROUNDS - 1) expect(tickets).toBe(0);
    }
    expect(tickets).toBe(LOCK_TICKET_LOCKS);
    expect(locks.find(l => l.key === "hero:c")!.dust).toBe(0);
    expect(locks.find(l => l.key === STAKE_LOCK_KEY)!.dust).toBe(0);
  });
});

describe("leaving a lock", () => {
  it("is free once mature and pays everything that was farmed", () => {
    const l = lock({ since: 1, farmed: 40 });
    const t = exitTerms(l, 1 + MATURITY_ROUNDS);
    expect(t).toMatchObject({ early: false, fee: 0, forfeit: 0, payout: 40, stakeBack: 0 });
  });

  it("forfeits half of what it farmed and charges a fee on its value when broken early", () => {
    const l = lock({ since: 1, farmed: 41, value: 600 });
    const t = exitTerms(l, 1 + MATURITY_ROUNDS - 1);
    expect(t.early).toBe(true);
    expect(t.fee).toBeCloseTo(600 * EXIT_FEE, 6);
    expect(t.forfeit).toBeCloseTo(Math.floor(41 * EXIT_FORFEIT * 100) / 100, 6);
    expect(t.forfeit + t.payout).toBeCloseTo(41, 6);
  });

  it("makes a stake pay the fee out of what it hands back", () => {
    const stake = lock({ key: STAKE_LOCK_KEY, kind: "stake", value: 2_000, farmed: 10, since: 1 });
    const early = exitTerms(stake, 2);
    expect(early.stakeBack).toBeCloseTo(2_000 - 2_000 * EXIT_FEE, 6);
    expect(exitTerms(stake, 1 + MATURITY_ROUNDS).stakeBack).toBe(2_000);
    // An NFT lock has nothing to hand back: its fee comes from the balance.
    expect(exitTerms(lock(), 2).stakeBack).toBe(0);
  });

  it("makes breaking a lock early cost more than a round of farming can earn", () => {
    // Otherwise locking and unlocking every round would be free money.
    const l = lock({ value: 1_500 });
    const oneRound = settleLocks([l], 1, 1_400, 8_000).payouts[l.key];
    expect(exitTerms({ ...l, farmed: oneRound }, 2).fee).toBeGreaterThan(oneRound * 3);
  });
});
