import {
  EXPEDITION_REVENUE, LOCK_SHARE, POOL_SHARE, RARITY_SUPPLY, REVENUE_SHARE, SIGIL_RARITY_WEIGHTS, WORLD_MINT_SEED,
} from "./config";
import { CLASS_IDS, type HeroNft, type Rarity } from "./catalog";
import { createRng, pick, randomSeed, weighted } from "./rng";

/** Money is in cents of simulated USDC. */
export type Ledger = {
  /** Your balance. */
  balance: number;
  /** The gold-share round pool that descents compete for. */
  pool: number;
  /** The lock pool, shared by passive gold when the round closes. */
  locked: number;
  /** What your spending has paid the studio. */
  revenue: number;
  spent: number;
  returned: number;
};

export type LedgerEntry = {
  at: number;
  kind: "spend" | "payout" | "faucet";
  label: string;
  amount: number;
  revenue: number;
  pooled: number;
  locked?: number;
};

/**
 * Every cent spent is split the same way: the studio's revenue, the lock pool and the round pool.
 * The last two together are POOL_SHARE, the part that goes back to players.
 */
export function splitSpend(amount: number) {
  const revenue = round(amount * REVENUE_SHARE);
  const locked = round(amount * LOCK_SHARE);
  return { revenue, locked, pooled: round(amount - revenue - locked) };
}

/** Expeditions split their price their own way: more to the studio, the rest to the round pool. */
export function splitExpeditionSpend(amount: number) {
  const revenue = round(amount * EXPEDITION_REVENUE);
  return { revenue, locked: 0, pooled: round(amount - revenue) };
}

export function applySpend(ledger: Ledger, amount: number, split = splitSpend(amount)): Ledger {
  if (amount > ledger.balance + 1e-9) throw new Error("Not enough USDC");
  const { revenue, pooled, locked } = split;
  return {
    balance: round(ledger.balance - amount),
    pool: round(ledger.pool + pooled),
    locked: round(ledger.locked + locked),
    revenue: round(ledger.revenue + revenue),
    spent: round(ledger.spent + amount),
    returned: ledger.returned,
  };
}

/** Books a fee that goes wholly to the studio, such as breaking a lock early. Nothing is split; the caller moves the balance. */
export function applyFee(ledger: Ledger, amount: number): Ledger {
  return { ...ledger, revenue: round(ledger.revenue + amount), spent: round(ledger.spent + amount) };
}

/** Your fraction of this round's banked gold. It is the fraction of the pool you receive. */
export function roundShare(yourGold: number, fieldGold: number) {
  const total = yourGold + fieldGold;
  return total > 0 ? yourGold / total : 0;
}

export type RoundSettlement = {
  /** Fraction of the round's gold that was yours. */
  share: number;
  payout: number;
  /** The simulated crowd's cut of the pool. */
  fieldPayout: number;
  /** What the return cap held back from your share. It stays in the pool. */
  withheld: number;
  /** Pool left for the next round: cents of dust, anything the cap held back, or all of it if nobody banked gold. */
  carry: number;
};

/**
 * Splits the pool exactly by gold. Every share is rounded down to a hundredth of a cent, so the players together
 * never receive more than the pool holds, and a 1% share of the gold takes 1% of the pool.
 * `cap` is the most your share may pay out (see MAX_ROUND_RETURN); the rest stays in the pool.
 */
export function settleRound(pool: number, yourGold: number, fieldGold: number, cap = Infinity): RoundSettlement {
  const total = yourGold + fieldGold;
  if (total <= 0 || pool <= 0) return { share: 0, payout: 0, fieldPayout: 0, withheld: 0, carry: round(Math.max(0, pool)) };
  const down = (n: number) => Math.floor((n + 1e-9) * 100) / 100;
  const owed = down(pool * yourGold / total);
  const payout = Math.min(owed, down(Math.max(0, cap)));
  const fieldPayout = down(pool * (total - yourGold) / total);
  // Both shares round down, so a little dust can remain. It stays in the pool for the next round.
  return { share: yourGold / total, payout, fieldPayout, withheld: round(owed - payout), carry: round(pool - payout - fieldPayout) };
}

export function applyClaim(ledger: Ledger, settlement: RoundSettlement): Ledger {
  return {
    ...ledger,
    balance: round(ledger.balance + settlement.payout),
    pool: round(settlement.carry),
    returned: round(ledger.returned + settlement.payout),
  };
}

export function mintHero(rarity: Rarity, serial: number, source: HeroNft["source"], seed = randomSeed(), edition?: number): HeroNft {
  const rng = createRng(seed);
  return {
    id: `${Date.now().toString(36)}-${seed.toString(36)}`,
    serial,
    classId: pick(rng, CLASS_IDS),
    rarity,
    source,
    mintedAt: Date.now(),
    edition,
  };
}

/** Rolls the rarity of a free mint (a Soul Sigil or a draw win). Sold-out rarities are skipped, so it never mints past the cap. */
export function rollSigilRarity(seed = randomSeed(), available: readonly Rarity[] = Object.keys(SIGIL_RARITY_WEIGHTS) as Rarity[]): Rarity {
  const weights = Object.fromEntries(available.map(r => [r, SIGIL_RARITY_WEIGHTS[r]])) as Record<Rarity, number>;
  if (available.length === 0) throw new Error("Every Delver has been minted");
  return weighted(createRng(seed), weights);
}

/** Delvers of this rarity still left to mint, counting the simulated community's share. */
export function mintsLeft(rarity: Rarity, mintedByYou: number) {
  return Math.max(0, RARITY_SUPPLY[rarity] - WORLD_MINT_SEED[rarity] - mintedByYou);
}

export { POOL_SHARE, REVENUE_SHARE };

function round(n: number) {
  return Math.round(n * 100) / 100;
}
