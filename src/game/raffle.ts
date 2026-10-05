// The weekly draw. Raffle tickets drop in the deep (and from expeditions and locks); only tickets carried home count.
// Each week DRAW_MINTS Delvers are minted free for the holders of the winning tickets. Nothing is bought for the draw:
// a win is a mint from the fixed supply.
import {
  ACTIVE_SHARE, DRAW_MINTS, FIELD_EXTRACT_SHARE, FIELD_GOLD_PER_CENT, FIELD_LOCK_GOLD, FIELD_ROLLS_PER_CENT, FIELD_WEEK_SPEND,
  LOCK_SHARE, PASSES, REVENUE_SHARE, TICKET_DROP_CHANCE, type PassId,
} from "./config";
import type { Rarity } from "./catalog";
import { int, type Rng, createRng } from "./rng";

export type DrawPrize = {
  /** Won by you, or by the simulated field. */
  fate: "you" | "field";
  /** What your win minted. The field's wins stay unrevealed. */
  rarity?: Rarity;
};

export type DrawResult = {
  mints: number;
  prizes: DrawPrize[];
  yourTickets: number;
  fieldTickets: number;
};

export function ticketChance(pass: PassId | null) {
  return pass ? PASSES[pass].chance : TICKET_DROP_CHANCE;
}

/** What a new pass costs. Null means the player already holds a higher one. Zero means it is already active. */
export function passCost(next: PassId, current: PassId | null) {
  if (current === next) return 0;
  if (current === "pro") return null;
  if (current === "plus" && next === "pro") return PASSES.pro.price - PASSES.plus.price;
  return PASSES[next].price;
}

/** Tickets found in the dark only count if you carry them out. */
export function ticketsKept(extracted: boolean, found: number) {
  return extracted ? found : 0;
}

export function fieldWeek() {
  const tickets = Math.round(FIELD_WEEK_SPEND * FIELD_EXTRACT_SHARE * FIELD_ROLLS_PER_CENT * TICKET_DROP_CHANCE);
  return {
    spent: FIELD_WEEK_SPEND,
    revenue: round(FIELD_WEEK_SPEND * REVENUE_SHARE),
    /** The crowd's share of the pools and the gold it banked, so its slice of the round grows with its spend. */
    pooled: round(FIELD_WEEK_SPEND * ACTIVE_SHARE),
    locked: round(FIELD_WEEK_SPEND * LOCK_SHARE),
    gold: Math.round(FIELD_WEEK_SPEND * FIELD_GOLD_PER_CENT),
    lockGold: FIELD_LOCK_GOLD,
    tickets,
  };
}

/** Draws this week's free mints, each weighted by tickets. Returns null when nobody holds a ticket. */
export function drawWeek(input: { yourTickets: number; fieldTickets: number; seed: number; mints?: number }): DrawResult | null {
  const mints = input.mints ?? DRAW_MINTS;
  const total = input.yourTickets + input.fieldTickets;
  if (mints <= 0 || total <= 0) return null;
  const rng = createRng(input.seed);
  const prizes = Array.from({ length: mints }, () => ({ fate: winner(rng, input.yourTickets, total) }));
  return { mints, prizes, yourTickets: input.yourTickets, fieldTickets: input.fieldTickets };
}

function winner(rng: Rng, yourTickets: number, total: number): "you" | "field" {
  return int(rng, 1, total) <= yourTickets ? "you" : "field";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
