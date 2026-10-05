import { describe, expect, it } from "vitest";
import { InsufficientFunds, LockError, computeRunPerks, mergeSavedState, migrateSavedState, useGame } from "./store";
import type { HeroNft } from "@/game/catalog";
import {
  EXIT_FEE, FIELD_LOCK_GOLD, HOLD_FACTOR, LOCK_MAX, LOCK_START, MATURITY_ROUNDS, ROUND_SEED_LOCKED, STAKE_MAX,
} from "@/game/config";
import { settleRound } from "@/game/economy";
import { heroLockValue } from "@/game/locks";

const legendaryProspector: HeroNft = { id: "leg-1", serial: 1, classId: "prospector", rarity: "legendary", source: "altar", mintedAt: 0 };

function fresh(over: Record<string, unknown> = {}) {
  useGame.getState().reset();
  useGame.setState({ heroes: [legendaryProspector], hero: { kind: "nft", id: legendaryProspector.id }, ...over });
}
function closeRounds(n: number) {
  for (let i = 0; i < n; i++) useGame.getState().claimRound();
}
const gold = () => computeRunPerks(useGame.getState()).goldPct;

describe("locks", () => {
  it("weakens a held perk, then grows it round by round once the Delver is locked", () => {
    fresh();
    const held = gold();
    expect(held).toBe(Math.round(60 * HOLD_FACTOR));
    useGame.getState().lockHero(legendaryProspector.id);
    expect(gold()).toBe(Math.round(60 * LOCK_START));
    expect(gold()).toBeGreaterThan(held);
    closeRounds(MATURITY_ROUNDS);
    expect(gold()).toBe(60);
    closeRounds(10);
    expect(gold()).toBe(Math.round(60 * LOCK_MAX));
    useGame.getState().reset();
  });

  it("refuses to lock a Delver you do not own and locks each thing once", () => {
    fresh();
    expect(() => useGame.getState().lockHero("nope")).toThrow(LockError);
    useGame.getState().lockHero(legendaryProspector.id);
    useGame.getState().lockHero(legendaryProspector.id);
    expect(useGame.getState().locks).toHaveLength(1);
    useGame.getState().reset();
  });

  it("closes a round with no gold of yours when a lock is waiting, and farms into the lock, not the balance", () => {
    fresh();
    expect(useGame.getState().claimRound()).toBeNull();
    useGame.getState().lockHero(legendaryProspector.id);
    const before = useGame.getState();
    const result = useGame.getState().claimRound()!;
    const after = useGame.getState();
    expect(result.farmed).toBeGreaterThan(0);
    expect(after.round).toBe(before.round + 1);
    expect(after.balance).toBe(before.balance);
    expect(after.locks[0].farmed).toBeCloseTo(result.farmed, 6);
    expect(after.locked).toBeCloseTo(ROUND_SEED_LOCKED, 0);
    expect(after.fieldLockGold).toBe(FIELD_LOCK_GOLD);
    useGame.getState().reset();
  });

  it("keeps a lock's farming out of the round pool that descents share", () => {
    fresh({ roundGold: 100, roundSpent: 1_000, pool: 10_000, fieldGold: 9_900 });
    useGame.getState().lockHero(legendaryProspector.id);
    const result = useGame.getState().claimRound()!;
    expect(result.payout).toBe(100);
    useGame.getState().reset();
  });

  it("does not let locks change what a round pays, or charge anything", () => {
    fresh({ balance: 10_000, roundGold: 50, roundSpent: 1_000, pool: 4_000, fieldGold: 950 });
    const withoutLock = settleRound(4_000, 50, 950).payout;
    useGame.getState().lockHero(legendaryProspector.id);
    useGame.getState().stake(STAKE_MAX);
    const revenue = useGame.getState().revenue;
    const result = useGame.getState().claimRound()!;
    expect(result.payout).toBe(withoutLock);
    expect(useGame.getState().revenue).toBe(revenue);
    useGame.getState().reset();
  });

  it("holds what a lock farmed until it matures, then lets you harvest it and keep the lock", () => {
    fresh();
    useGame.getState().lockHero(legendaryProspector.id);
    closeRounds(MATURITY_ROUNDS - 1);
    expect(() => useGame.getState().harvest("hero:leg-1")).toThrow(LockError);
    closeRounds(1);
    const farmed = useGame.getState().locks[0].farmed;
    const balance = useGame.getState().balance;
    expect(farmed).toBeGreaterThan(0);
    expect(useGame.getState().harvest("hero:leg-1")).toBeCloseTo(farmed, 6);
    const after = useGame.getState();
    expect(after.balance).toBeCloseTo(balance + farmed, 6);
    expect(after.returned).toBeCloseTo(farmed, 6);
    expect(after.locks).toHaveLength(1);
    expect(after.locks[0].farmed).toBe(0);
    useGame.getState().reset();
  });

  it("releases a mature lock for free with everything it farmed", () => {
    fresh();
    useGame.getState().lockHero(legendaryProspector.id);
    closeRounds(MATURITY_ROUNDS);
    const before = useGame.getState();
    const t = useGame.getState().unlock("hero:leg-1");
    const after = useGame.getState();
    expect(t.early).toBe(false);
    expect(after.balance).toBeCloseTo(before.balance + before.locks[0].farmed, 6);
    expect(after.revenue).toBe(before.revenue);
    expect(after.locks).toHaveLength(0);
    expect(gold()).toBe(Math.round(60 * HOLD_FACTOR));
    useGame.getState().reset();
  });

  it("forfeits half of what it farmed back to the lock pool and charges a tenth of the value on an early break", () => {
    fresh();
    useGame.getState().lockHero(legendaryProspector.id);
    closeRounds(2);
    const before = useGame.getState();
    const farmed = before.locks[0].farmed;
    const t = useGame.getState().unlock("hero:leg-1");
    const after = useGame.getState();
    expect(t.early).toBe(true);
    expect(t.fee).toBeCloseTo(heroLockValue(legendaryProspector) * EXIT_FEE, 6);
    expect(after.revenue).toBeCloseTo(before.revenue + t.fee, 6);
    expect(after.balance).toBeCloseTo(before.balance - t.fee + (farmed - t.forfeit), 6);
    expect(after.locked).toBeCloseTo(before.locked + t.forfeit, 6);
    expect(after.locks).toHaveLength(0);
    useGame.getState().reset();
  });

  it("will not let a Delver lock be broken early without the money for the fee", () => {
    fresh({ balance: 5 });
    useGame.getState().lockHero(legendaryProspector.id);
    expect(() => useGame.getState().unlock("hero:leg-1")).toThrow(InsufficientFunds);
    expect(useGame.getState().locks).toHaveLength(1);
    useGame.getState().reset();
  });

  it("stakes out of the balance, adds gold, and gives it back when released", () => {
    fresh({ balance: 10_000 });
    const balance = useGame.getState().balance;
    const noStake = gold();
    useGame.getState().stake(STAKE_MAX);
    expect(useGame.getState().balance).toBe(balance - STAKE_MAX);
    expect(useGame.getState().spent).toBe(0);
    expect(gold()).toBeGreaterThan(noStake);
    closeRounds(MATURITY_ROUNDS);
    const farmed = useGame.getState().locks[0].farmed;
    useGame.getState().unlock("stake");
    expect(useGame.getState().balance).toBeCloseTo(balance + farmed, 6);
    expect(gold()).toBe(noStake);
    useGame.getState().reset();
  });

  it("pays the fee out of an early-broken stake and refuses stakes it cannot cover", () => {
    fresh();
    const balance = useGame.getState().balance;
    useGame.getState().stake(1_000);
    useGame.getState().unlock("stake");
    const after = useGame.getState();
    expect(after.balance).toBeCloseTo(balance - 1_000 * EXIT_FEE, 6);
    expect(after.revenue).toBeCloseTo(1_000 * EXIT_FEE, 6);
    fresh({ balance: 100 });
    expect(() => useGame.getState().stake(500)).toThrow(InsufficientFunds);
    expect(() => useGame.getState().stake(123)).toThrow(LockError);
    expect(() => useGame.getState().stake(STAKE_MAX + 500)).toThrow(LockError);
    expect(useGame.getState().balance).toBe(100);
    useGame.getState().reset();
  });

  it("earns a draw ticket only slowly, from a Delver lock", () => {
    fresh();
    useGame.getState().lockHero(legendaryProspector.id);
    closeRounds(MATURITY_ROUNDS - 1);
    expect(useGame.getState().tickets).toBe(0);
    closeRounds(1);
    expect(useGame.getState().tickets).toBe(1);
    useGame.getState().reset();
  });

  it("adds the crowd's lockers together with its spend", () => {
    fresh();
    const before = useGame.getState();
    before.addFieldWeek();
    const after = useGame.getState();
    expect(after.fieldLockGold - before.fieldLockGold).toBe(FIELD_LOCK_GOLD);
    expect(after.locked - before.locked).toBeCloseTo(ROUND_SEED_LOCKED, 6);
    useGame.getState().reset();
  });
});

describe("saved locks", () => {
  const hero: HeroNft = { id: "h1", serial: 1, classId: "seer", rarity: "epic", source: "altar", mintedAt: 1 };
  const good = { key: "hero:h1", kind: "hero", since: 2, value: 600, farmed: 3.5, dust: 0.25 };

  it("keeps valid locks and drops broken, repeated or orphaned ones", () => {
    const restored = mergeSavedState({
      heroes: [hero],
      locks: [
        good, good,
        { ...good, key: "hero:gone" },
        { ...good, key: "stake", kind: "hero" },
        { ...good, since: 0 },
        { ...good, farmed: -1 },
        { ...good, dust: 1 },
        { key: "stake", kind: "stake", since: 1, value: 999_999, farmed: 0, dust: 0 },
        { key: "friend", kind: "friend", since: 3, value: 500, farmed: 0, dust: 0 },
        { key: "stake", kind: "stake", since: 3, value: 500, farmed: 0, dust: 0 },
        null, "lock",
      ],
    }, useGame.getState());
    // A Friend lock from the Rare Friends version of the game has no place here and is dropped.
    expect(restored.locks.map(l => l.key)).toEqual(["hero:h1", "stake"]);
  });

  it("starts an old save with no locks and a fresh lock pool", () => {
    const old = migrateSavedState({ balance: 500, pool: 4_000 }, 4) as Record<string, unknown>;
    expect(old.locks).toEqual([]);
    expect(old.locked).toBe(ROUND_SEED_LOCKED);
    expect(old.fieldLockGold).toBe(FIELD_LOCK_GOLD);
    expect(old.pool).toBe(4_000);
    const restored = mergeSavedState({}, useGame.getState());
    expect(restored.locks).toEqual([]);
    expect(restored.locked).toBe(ROUND_SEED_LOCKED);
  });
});
