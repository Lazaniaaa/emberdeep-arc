import type { Rng } from "./rng";
import { next } from "./rng";

/**
 * How a creature hits. A creature never strikes without warning: it first winds up, and the tiles it is about to hit are
 * marked for the delver to step off.
 * - cross: the four directions around it, up to `range` tiles each.
 * - line: one direction, aimed at the delver when the wind-up starts, up to `range` tiles.
 */
export type EnemyAttack = "line" | "cross";

export type EnemyDef = {
  id: string;
  name: string;
  /** First floor it appears on. */
  minDepth: number;
  /** Relative odds among the creatures that can appear on a floor. */
  weight: number;
  attack: EnemyAttack;
  range: number;
  /** Turns between the warning and the blow. One means the delver gets a single move to step aside. */
  windup: number;
  /** Multiplier on the floor's creature health. */
  hp: number;
  /** Multiplier on how eagerly it closes in. Zero means it never closes in. */
  move: number;
  /**
   * It keeps its distance instead: one step away from the delver, then a rest of this many turns (drawn at random
   * between the two) before the next, so a delver who presses on catches it.
   */
  retreat?: readonly [number, number];
  blurb: string;
};

// The ids are from the first creatures and stay as they are (saves and replays name them); the names and looks changed.
export const ENEMIES = [
  { id: "wickgnaw", name: "Waxling", minDepth: 1, weight: 5, attack: "cross", range: 1, windup: 1, hp: 1, move: 1, blurb: "A stub of living candle wax. Burns whatever stands beside it." },
  { id: "snaretoad", name: "Cave Spider", minDepth: 1, weight: 3, attack: "line", range: 3, windup: 2, hp: 1.3, move: 0.6, blurb: "Slow, but its web reaches three tiles down a line." },
  { id: "cinder-hound", name: "Lantern Moth", minDepth: 2, weight: 3, attack: "line", range: 3, windup: 1, hp: 1, move: 1.5, blurb: "Fast, and drawn to your light. Dives down a line the moment it sees you." },
  { id: "chaincoil", name: "Skeleton Archer", minDepth: 2, weight: 2, attack: "line", range: 4, windup: 1, hp: 0.9, move: 0, retreat: [1, 3], blurb: "Shoots four tiles down a line and backs away from you, slowly enough to be caught." },
  { id: "needle-wraith", name: "Wisp", minDepth: 3, weight: 2, attack: "line", range: 3, windup: 1, hp: 0.8, move: 1.2, blurb: "Frail and quick. Throws a spark down a line." },
  { id: "sootplate", name: "Stone Golem", minDepth: 3, weight: 2, attack: "cross", range: 1, windup: 2, hp: 1.7, move: 0.7, blurb: "Armoured and slow. Winds up for two turns, then slams all around." },
  { id: "hollow-burrower", name: "Skull Crab", minDepth: 4, weight: 2, attack: "cross", range: 1, windup: 1, hp: 1.3, move: 1, blurb: "Hides in an old skull, then pops out snapping at whatever is beside it." },
  { id: "fourfold-bell", name: "Spore Shroom", minDepth: 5, weight: 2, attack: "cross", range: 2, windup: 1, hp: 1.2, move: 0.8, blurb: "Bursts spores in four directions, two tiles each." },
  { id: "rift-leaper", name: "Imp", minDepth: 5, weight: 2, attack: "line", range: 3, windup: 1, hp: 1, move: 1.5, blurb: "Leaps down a line at you. Very fast." },
] as const satisfies readonly EnemyDef[];

export type EnemySpecies = typeof ENEMIES[number]["id"];

/** The creature a saved descent from before species existed is treated as. */
export const DEFAULT_SPECIES: EnemySpecies = "wickgnaw";

export const isSpecies = (value: unknown): value is EnemySpecies => ENEMIES.some(e => e.id === value);

export function enemyDef(species: EnemySpecies | undefined): EnemyDef {
  return ENEMIES.find(e => e.id === (species ?? DEFAULT_SPECIES)) ?? ENEMIES[0];
}

export const enemyName = (species: EnemySpecies | undefined) => enemyDef(species).name;

export function enemiesAvailableAt(depth: number) {
  return ENEMIES.filter(e => e.minDepth <= depth);
}

/** Picks a creature for a floor, more often the common ones. */
export function pickEnemy(rng: Rng, depth: number): EnemySpecies {
  const pool = enemiesAvailableAt(depth);
  let roll = next(rng) * pool.reduce((n, e) => n + e.weight, 0);
  for (const e of pool) {
    roll -= e.weight;
    if (roll < 0) return e.id;
  }
  return pool[pool.length - 1].id;
}
