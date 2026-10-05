import { describe, expect, it } from "vitest";
import {
  EXPEDITION_BASE_LOOT, EXPEDITION_COST, EXPEDITION_PACKS, EXPEDITION_POOL, EXPEDITION_REVENUE, EXPEDITION_TIERS,
  KEY_PRICE, ROUND_SEED_GOLD, ROUND_SEED_POOL, type PackId,
} from "./config";
import { splitExpeditionSpend } from "./economy";
import { chanceAtLeast, expectedLoot, hasReturned, meanMultiplier, rollExpedition, secondsLeft } from "./expedition";

const PACKS = Object.keys(EXPEDITION_PACKS) as PackId[];
const SAMPLES = 20_000;
/** Rough worth of a ticket in cents for these checks; an assumption, like everything about a raffle ticket's price. */
const TICKET_RF = 20;
const GOLD_RF = ROUND_SEED_POOL / ROUND_SEED_GOLD;

describe("expedition setup", () => {
  it("splits the price 45% to the studio and 55% to the round pool", () => {
    expect(EXPEDITION_REVENUE + EXPEDITION_POOL).toBeCloseTo(1, 10);
    for (const amount of [100, 130, 180, 300]) {
      const s = splitExpeditionSpend(amount);
      expect(s.revenue).toBeCloseTo(amount * 0.45, 6);
      expect(s.pooled).toBeCloseTo(amount * 0.55, 6);
      expect(s.locked).toBe(0);
      expect(s.revenue + s.pooled).toBeCloseTo(amount, 6);
    }
  });

  it("costs about a dollar and sells three packs that raise the chance of coming home with a haul", () => {
    expect(EXPEDITION_COST).toBe(100);
    expect(PACKS).toHaveLength(4);
    let last = { price: -1, chance: 0 };
    for (const id of PACKS) {
      const p = EXPEDITION_PACKS[id];
      expect(p.price).toBeGreaterThan(last.price);
      expect(p.chance).toBeGreaterThan(last.chance);
      expect(p.chance).toBeGreaterThan(0);
      expect(p.chance).toBeLessThan(1);
      last = p;
    }
  });

  it("covers hauls from x0.6 to x15 in contiguous rarities that get rarer as they get bigger", () => {
    expect(EXPEDITION_TIERS[0].min).toBe(0.6);
    expect(EXPEDITION_TIERS[EXPEDITION_TIERS.length - 1].max).toBe(15);
    expect(EXPEDITION_TIERS.reduce((n, t) => n + t.weight, 0)).toBe(10_000);
    EXPEDITION_TIERS.forEach((t, i) => {
      expect(t.min).toBeLessThan(t.max);
      if (i > 0) {
        expect(t.min).toBe(EXPEDITION_TIERS[i - 1].max);
        expect(t.weight).toBeLessThan(EXPEDITION_TIERS[i - 1].weight);
      }
    });
    // Mostly low rarity.
    expect(EXPEDITION_TIERS[0].weight).toBeGreaterThanOrEqual(8_000);
  });
});

describe("rolling a trip", () => {
  it("is decided entirely by the seed and the pack", () => {
    for (const pack of PACKS) {
      for (const seed of [1, 42, 99_999]) expect(rollExpedition(seed, pack)).toEqual(rollExpedition(seed, pack));
    }
  });

  it("brings nothing home on a failure and a whole number of keys and tickets on a success", () => {
    for (const pack of PACKS) {
      for (let seed = 1; seed <= 2_000; seed++) {
        const o = rollExpedition(seed * 7_919, pack);
        if (!o.success) {
          expect(o).toEqual({ success: false, tier: null, multiplier: 0, loot: { keys: 0, tickets: 0, gold: 0 } });
          continue;
        }
        expect(o.multiplier).toBeGreaterThanOrEqual(0.6);
        expect(o.multiplier).toBeLessThanOrEqual(15);
        const tier = EXPEDITION_TIERS.find(t => t.id === o.tier)!;
        expect(o.multiplier).toBeGreaterThanOrEqual(tier.min - 0.01);
        expect(o.multiplier).toBeLessThanOrEqual(tier.max + 0.01);
        for (const [got, base] of [[o.loot.keys, EXPEDITION_BASE_LOOT.keys], [o.loot.tickets, EXPEDITION_BASE_LOOT.tickets]] as const) {
          expect(Number.isInteger(got)).toBe(true);
          expect(got).toBeGreaterThanOrEqual(Math.floor(o.multiplier * base));
          expect(got).toBeLessThanOrEqual(Math.ceil(o.multiplier * base));
        }
        expect(o.loot.gold).toBe(Math.round(o.multiplier * EXPEDITION_BASE_LOOT.gold));
      }
    }
  });

  it("comes home with a haul as often as its pack says, and mostly with a common one", () => {
    for (const pack of PACKS) {
      let wins = 0, common = 0, big = 0, sum = 0;
      for (let seed = 1; seed <= SAMPLES; seed++) {
        const o = rollExpedition(seed * 2_654_435_761 % 4_294_967_296, pack);
        if (!o.success) continue;
        wins++; sum += o.multiplier;
        if (o.tier === "common") common++;
        if (o.multiplier >= 10) big++;
      }
      expect(Math.abs(wins / SAMPLES - EXPEDITION_PACKS[pack].chance)).toBeLessThan(0.02);
      expect(common / wins).toBeGreaterThan(0.8);
      expect(big / wins).toBeLessThan(0.01);
      // The average multiplier matches the tables.
      expect(Math.abs(sum / wins - meanMultiplier()) / meanMultiplier()).toBeLessThan(0.05);
    }
  });

  it("only ever brings a big haul now and then", () => {
    expect(chanceAtLeast("vanguard", 5)).toBeLessThan(0.01);
    expect(chanceAtLeast("vanguard", 10)).toBeLessThan(0.001);
    expect(chanceAtLeast("none", 10)).toBeGreaterThan(0);
  });
});

describe("what an expedition is worth", () => {
  const worth = (pack: PackId) => {
    const l = expectedLoot(pack);
    return l.keys * KEY_PRICE + l.tickets * TICKET_RF + l.gold * GOLD_RF;
  };

  it("pays a better haul the better the pack, but never as much as the trip and its pack cost", () => {
    let last = 0;
    for (const pack of PACKS) {
      const w = worth(pack);
      expect(w).toBeGreaterThan(last);
      // Even the best pack returns less, on average, than it cost to send the Delver.
      expect(w).toBeLessThan(EXPEDITION_COST + EXPEDITION_PACKS[pack].price);
      last = w;
    }
    // Without a pack the average haul is worth clearly less than the trip cost.
    expect(worth("none")).toBeLessThan(EXPEDITION_COST * 0.7);
  });

  it("gives exact chances: at least the smallest haul is the success chance, at least the biggest is none", () => {
    for (const pack of PACKS) {
      expect(chanceAtLeast(pack, 0.6)).toBeCloseTo(EXPEDITION_PACKS[pack].chance, 10);
      expect(chanceAtLeast(pack, 15)).toBe(0);
      expect(chanceAtLeast(pack, 2)).toBeLessThan(chanceAtLeast(pack, 1));
      expect(chanceAtLeast(pack, 5)).toBeLessThan(chanceAtLeast(pack, 2));
    }
  });
});

describe("the clock", () => {
  it("is back once its time is up and counts the seconds left", () => {
    expect(hasReturned(10_000, 9_999)).toBe(false);
    expect(hasReturned(10_000, 10_000)).toBe(true);
    expect(secondsLeft(10_000, 4_500)).toBe(6);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
  });
});
