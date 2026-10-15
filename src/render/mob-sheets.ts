import type { EnemySpecies } from "@/game/enemies";
import { loadSheet, type Sheet } from "./sheets";

/**
 * The creatures are pixel-art strips (public/mobs/<species>.png, made from art/mobs/raw by scripts/sprite-sheets.mjs):
 * 4 frames facing right, each in a MOB_CELL_W x MOB_CELL_H cell with the feet at (MOB_FOOT_X, MOB_FOOT_Y). The cell is
 * wide because an attack (an arrow, a web, a spark) flies ahead of the creature. Facing left is the same picture mirrored.
 */

/** "a" stands, "b" steps (or flaps), "w" winds up a blow and "s" lands it. */
export type MobFrame = "a" | "b" | "w" | "s";

export const MOB_CELL_W = 96, MOB_CELL_H = 56;
export const MOB_FOOT_X = 32, MOB_FOOT_Y = 52;
export const MOB_TEXTURE_SCALE = 2;

const COL: Record<MobFrame, number> = { a: 0, b: 1, w: 2, s: 3 };
export const mobFrameX = (frame: MobFrame) => COL[frame] * MOB_CELL_W * MOB_TEXTURE_SCALE;

/** Logical height, preserving proportions at roughly one tile along the longer side. The already-large golem stays 36. */
export const MOB_HEIGHT: Record<EnemySpecies, number> = {
  wickgnaw: 30, snaretoad: 22, "cinder-hound": 28, chaincoil: 29, "needle-wraith": 26,
  sootplate: 36, "hollow-burrower": 22, "fourfold-bell": 32, "rift-leaper": 28,
};

/** The strip of a creature, or null while it is still loading. */
export const mobSheet = (species: EnemySpecies): Sheet | null => loadSheet(`mobs/${species}.png`);
