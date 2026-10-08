/**
 * The delvers are cats and dogs drawn as pixel-art sprite sheets (public/heroes/*.png, made from the AI sheets in
 * art/heroes/raw by scripts/sprite-sheets.mjs). Each sheet is 5 frames across and 4 directions down, every frame in a
 * logical CELL_W x CELL_H cell with the feet at (FOOT_X, FOOT_Y), so frames swap without the delver jumping.
 * The PNG holds TEXTURE_SCALE pixels per logical pixel to preserve the original eyes at desktop zoom.
 */

import type { Animal } from "@/game/animals";
import { loadSheet, type Sheet } from "./sheets";

export type { Animal };

export type HeroDir = "down" | "up" | "left" | "right";
/** "a" stands, "b" and "c" are the two steps of a walk, "w" winds up a blow and "s" lands it. */
export type HeroFrame = "a" | "b" | "c" | "w" | "s";

export const CELL_W = 64, CELL_H = 56;
export const FOOT_X = 32, FOOT_Y = 54;
export const TEXTURE_SCALE = 2;

const ROW: Record<HeroDir, number> = { down: 0, left: 1, right: 2, up: 3 };
const COL: Record<HeroFrame, number> = { a: 0, b: 1, c: 2, w: 3, s: 4 };

/** Where a frame sits in its sheet, in logical pixels (multiply by TEXTURE_SCALE when cropping the PNG). */
export const frameAt = (dir: HeroDir, frame: HeroFrame) => ({ sx: COL[frame] * CELL_W, sy: ROW[dir] * CELL_H });

/** The sheet of an animal, or null while it is still loading. */
export const animalSheet = (animal: Animal): Sheet | null => loadSheet(`heroes/${animal}.png`);
