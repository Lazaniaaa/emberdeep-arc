import { describe, expect, it } from "vitest";
import { ExpeditionError, InsufficientFunds, mergeSavedState, migrateSavedState, useGame, type Expedition } from "./store";
import type { HeroNft } from "@/game/catalog";
import { EXPEDITION_COST, EXPEDITION_DURATION_MS, EXPEDITION_PACKS, MAX_KEYS } from "@/game/config";
import { NO_LOOT, type Outcome } from "@/game/expedition";

const hero: HeroNft = { id: "d1", serial: 1, classId: "prospector", rarity: "epic", source: "altar", mintedAt: 0 };
const other: HeroNft = { id: "d2", serial: 2, classId: "seer", rarity: "rare", source: "altar", mintedAt: 0 };
const NOW = 1_000_000;

function fresh(over: Record<string, unknown> = {}) {
  useGame.getState().reset();
  useGame.setState({ heroes: [hero, other], hero: { kind: "nft", id: hero.id }, balance: 5_000, ...over });
}

const win: Outcome = { success: true, tier: "uncommon", multiplier: 1.5, loot: { keys: 2, tickets: 1, gold: 180 } };
const lose: Outcome = { success: false, tier: null, multiplier: 0, loot: NO_LOOT };
const trip = (over: Partial<Expedition> = {}): Expedition => ({
  id: "t1", heroId: hero.id, pack: "none", sentAt: NOW, returnsAt: NOW + EXPEDITION_DURATION_MS, outcome: win, ...over,
});

describe("sending a Delver away", () => {
  it("charges the trip and its pack, split 45% to the studio and 55% to the round pool", () => {
    fresh();
    const before = useGame.getState();
    const sent = useGame.getState().sendExpedition(hero.id, "ranger", NOW);
    const after = useGame.getState();
    const cost = EXPEDITION_COST + EXPEDITION_PACKS.ranger.price;
    expect(after.balance).toBeCloseTo(before.balance - cost, 6);
    expect(after.revenue - before.revenue).toBeCloseTo(cost * 0.45, 6);
    expect(after.pool - before.pool).toBeCloseTo(cost * 0.55, 6);
    expect(after.locked).toBeCloseTo(before.locked, 6);
    expect(after.spent - before.spent).toBeCloseTo(cost, 6);
    expect(sent).toMatchObject({ heroId: hero.id, pack: "ranger", sentAt: NOW, returnsAt: NOW + EXPEDITION_DURATION_MS });
    expect(after.expeditions).toEqual([sent]);
    expect(after.log[0]).toMatchObject({ kind: "spend", amount: cost });
    useGame.getState().reset();
  });

  it("does not raise the round's return cap, so trips cannot be used to lift it", () => {
    fresh();
    const before = useGame.getState().roundSpent;
    useGame.getState().sendExpedition(hero.id, "vanguard", NOW);
    expect(useGame.getState().roundSpent).toBe(before);
    useGame.getState().reset();
  });

  it("takes the Delver out of the descent it was picked for", () => {
    fresh();
    useGame.getState().sendExpedition(hero.id, "none", NOW);
    expect(useGame.getState().hero).toEqual({ kind: "wanderer" });
    fresh({ hero: { kind: "nft", id: other.id } });
    useGame.getState().sendExpedition(hero.id, "none", NOW);
    expect(useGame.getState().hero).toEqual({ kind: "nft", id: other.id });
    useGame.getState().reset();
  });

  it("refuses an unknown Delver, one already away, one that is in the cave, and a trip it cannot pay for", () => {
    fresh();
    expect(() => useGame.getState().sendExpedition("ghost", "none", NOW)).toThrow(ExpeditionError);
    useGame.getState().sendExpedition(hero.id, "none", NOW);
    expect(() => useGame.getState().sendExpedition(hero.id, "none", NOW)).toThrow(/already away/);
    fresh({ runSpent: 40 });
    expect(() => useGame.getState().sendExpedition(hero.id, "none", NOW)).toThrow(/descent/);
    fresh({ balance: EXPEDITION_COST - 1 });
    expect(() => useGame.getState().sendExpedition(hero.id, "none", NOW)).toThrow(InsufficientFunds);
    fresh({ balance: EXPEDITION_COST });
    expect(() => useGame.getState().sendExpedition(hero.id, "vanguard", NOW)).toThrow(InsufficientFunds);
    expect(useGame.getState().balance).toBe(EXPEDITION_COST);
    expect(useGame.getState().expeditions).toHaveLength(0);
    useGame.getState().reset();
  });

  it("lets several Delvers be away at once, each with its own trip", () => {
    fresh();
    useGame.getState().sendExpedition(hero.id, "none", NOW);
    useGame.getState().sendExpedition(other.id, "scout", NOW);
    const away = useGame.getState().expeditions;
    expect(away).toHaveLength(2);
    expect(new Set(away.map(e => e.id)).size).toBe(2);
    useGame.getState().reset();
  });
});

describe("collecting a haul", () => {
  it("keeps the Delver away until its time is up", () => {
    fresh({ expeditions: [trip()] });
    expect(() => useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS - 1)).toThrow(/Still away/);
    expect(useGame.getState().expeditions).toHaveLength(1);
    useGame.getState().reset();
  });

  it("hands over keys, tickets and gold, and frees the Delver", () => {
    fresh({ expeditions: [trip()], keys: 3, tickets: 4, roundGold: 50 });
    const back = useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS);
    const s = useGame.getState();
    expect(back).toMatchObject({ heroName: expect.stringContaining("Prospector"), pack: "none", keysLost: 0 });
    expect(s.keys).toBe(5);
    expect(s.tickets).toBe(5);
    expect(s.roundGold).toBe(230);
    expect(s.expeditions).toHaveLength(0);
    expect(s.returns[0]).toEqual(back);
    expect(s.stats.expeditions).toBe(1);
    expect(s.log[0].label).toContain("2 keys");
    useGame.getState().reset();
  });

  it("sends the Delver home with nothing after a failed trip, and still frees it", () => {
    fresh({ expeditions: [trip({ outcome: lose })], keys: 3, tickets: 4, roundGold: 50 });
    const back = useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS);
    const s = useGame.getState();
    expect(back.outcome.success).toBe(false);
    expect([s.keys, s.tickets, s.roundGold]).toEqual([3, 4, 50]);
    expect(s.expeditions).toHaveLength(0);
    expect(s.log[0].label).toContain("empty-handed");
    useGame.getState().reset();
  });

  it("caps the keys you can hold and says how many were lost", () => {
    const big: Outcome = { success: true, tier: "legendary", multiplier: 14, loot: { keys: 14, tickets: 14, gold: 1_680 } };
    fresh({ expeditions: [trip({ outcome: big })], keys: MAX_KEYS - 5 });
    const back = useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS);
    expect(useGame.getState().keys).toBe(MAX_KEYS);
    expect(back.keysLost).toBe(9);
    useGame.getState().reset();
  });

  it("can collect each trip once, and keeps only the last five returns", () => {
    fresh({ expeditions: [trip()] });
    useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS);
    expect(() => useGame.getState().collectExpedition("t1", NOW + EXPEDITION_DURATION_MS)).toThrow(ExpeditionError);
    for (let i = 0; i < 7; i++) {
      useGame.setState({ expeditions: [trip({ id: `r${i}` })] });
      useGame.getState().collectExpedition(`r${i}`, NOW + EXPEDITION_DURATION_MS);
    }
    expect(useGame.getState().returns).toHaveLength(5);
    expect(useGame.getState().stats.expeditions).toBe(8);
    useGame.getState().reset();
  });
});

describe("saved expeditions", () => {
  const good = { id: "t1", heroId: hero.id, pack: "scout", sentAt: 10, returnsAt: 40, outcome: win };

  it("keeps valid trips and drops broken, repeated and orphaned ones", () => {
    const restored = mergeSavedState({
      heroes: [hero, other],
      expeditions: [
        good,
        { ...good, id: "dup" },
        { ...good, id: "gone", heroId: "ghost" },
        { ...good, id: "pack", heroId: other.id, pack: "mythic" },
        { ...good, id: "time", heroId: other.id, returnsAt: 5 },
        { ...good, id: "loot", heroId: other.id, outcome: { ...win, loot: { keys: 999, tickets: 0, gold: 0 } } },
        { ...good, id: "mult", heroId: other.id, outcome: { ...win, multiplier: 99 } },
        { ...good, id: "tier", heroId: other.id, outcome: { ...win, tier: "mythic" } },
        null, "trip",
      ],
    }, useGame.getState());
    expect(restored.expeditions.map(e => e.id)).toEqual(["t1"]);
  });

  it("keeps a few valid returns and drops the rest", () => {
    const ok = { at: 1, heroName: "Seer #2", pack: "none", outcome: lose, keysLost: 0 };
    const restored = mergeSavedState({ returns: [ok, { ...ok, keysLost: -1 }, null, ...Array(8).fill(ok)] }, useGame.getState());
    expect(restored.returns).toHaveLength(5);
  });

  it("starts an older save with no expeditions", () => {
    const old = migrateSavedState({ balance: 500 }, 6) as Record<string, unknown>;
    expect(old.expeditions).toEqual([]);
    expect(old.returns).toEqual([]);
    const restored = mergeSavedState({}, useGame.getState());
    expect(restored.expeditions).toEqual([]);
    expect(restored.stats.expeditions).toBe(0);
  });
});
