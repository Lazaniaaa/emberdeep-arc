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

const COL: Record<MobFrame, number> = { a: 0, b: 1, w: 2, s: 3 };
export const mobFrameX = (frame: MobFrame) => COL[frame] * MOB_CELL_W;

/** How tall each creature stands, in pixels (the delver is 42), as scripts/sprite-sheets.mjs draws them. */
export const MOB_HEIGHT: Record<EnemySpecies, number> = {
  wickgnaw: 20, snaretoad: 20, "cinder-hound": 24, chaincoil: 28, "needle-wraith": 22,
  sootplate: 36, "hollow-burrower": 22, "fourfold-bell": 24, "rift-leaper": 26,
};

/** The strip of a creature, or null while it is still loading. */
export const mobSheet = (species: EnemySpecies): Sheet | null => loadSheet(`mobs/${species}.png`);
