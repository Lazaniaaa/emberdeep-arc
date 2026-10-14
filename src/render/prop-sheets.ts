import type { ItemKind } from "@/game/dungeon";
import type { PropKind } from "@/game/props";
import { loadSheet, type Sheet } from "./sheets";

/**
 * The things to smash and the loot on the floor as pixel art, made from art/props/raw by scripts/sprite-sheets.mjs:
 * public/props/<prop>.png is a strip of frames (whole, cracked, breaking apart) and public/props/loot.png one row of
 * the loot in LOOT_ORDER. Every cell is PROP_CELL_W x PROP_CELL_H with the base at (PROP_FOOT_X, PROP_FOOT_Y), drawn
 * at twice the game's pixel density (like the heroes), so a PNG cell is 96 x 80. A prop's strip holds 1, 3 or 6 frames
 * (see stagesOf). Until a sheet exists (or while it loads) the game draws the code sprites.
 */
export const PROP_CELL_W = 56, PROP_CELL_H = 48;
export const PROP_FOOT_X = 28, PROP_FOOT_Y = 43;

/** The loot row's order, the same as LOOT_ORDER in scripts/sprite-sheets.mjs. */
export const LOOT_ORDER: readonly ItemKind[] = ["gold", "crystal", "oil", "chest", "vault", "hoard"];

export const propSheet = (kind: PropKind): Sheet | null => loadSheet(`props/${kind}.png`);
export const lootSheet = (): Sheet | null => loadSheet("props/loot.png");

/** PNG pixels per game pixel, read from the sheet itself. */
const densityOf = (sheet: Sheet) => Math.max(1, Math.round(sheet.image.naturalHeight / PROP_CELL_H));
/** How many frames a prop's strip holds. */
export const framesOf = (sheet: Sheet) => Math.round(sheet.image.naturalWidth / (PROP_CELL_W * densityOf(sheet)));

/**
 * How a strip of n frames splits: the whole prop first, then the stages of cracks, then the stages of breaking apart.
 * 1 frame: only whole. 3: whole, cracked, breaking. 5 or more: whole, two stages of cracks, the rest breaking.
 */
export function stagesOf(n: number) {
  const cracks = n >= 5 ? 2 : n >= 3 ? 1 : 0;
  return { cracks, breaks: Math.max(0, n - 1 - cracks) };
}

/** The frame a standing prop shows: whole until it is hit, then the stage of cracks for how many blows it has taken. */
export function standingFrame(sheet: Sheet, hp: number, maxHp: number): number {
  const { cracks } = stagesOf(framesOf(sheet));
  if (hp >= maxHp || cracks === 0) return 0;
  // With two stages, the deeper cracks show once half the blows or more are taken: a two-blow prop looks badly hit after one.
  return cracks === 1 || hp * 2 > maxHp ? 1 : 2;
}

/**
 * The frame of the breaking-apart animation at k (0 to 1 of it): it runs from the frame after the one the prop stood
 * at (hp and maxHp before the last blow) to the last, so a prop broken at one blow goes through every crack too.
 * Null when there is nothing left to play.
 */
export function breakingFrame(sheet: Sheet, k: number, hp = 1, maxHp = 1): number | null {
  const n = framesOf(sheet);
  const from = standingFrame(sheet, hp, maxHp) + 1;
  if (from >= n) return null;
  return from + Math.min(n - 1 - from, Math.floor(k * (n - from)));
}

/** Where a loot item sits in the loot row. */
export const lootIndex = (kind: ItemKind) => Math.max(0, LOOT_ORDER.indexOf(kind));

/**
 * Draws one cell with its base on (x, baseY), centred on x. Returns false (drawing nothing) when the sheet is not
 * there, so the caller can fall back to the code sprite.
 */
export function drawCell(ctx: CanvasRenderingContext2D, sheet: Sheet | null, frame: number | null, x: number, baseY: number, alpha = 1) {
  if (!sheet || frame === null) return false;
  const d = densityOf(sheet), sx = frame * PROP_CELL_W;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(sheet.image, sx * d, 0, PROP_CELL_W * d, PROP_CELL_H * d, Math.round(x - PROP_FOOT_X), Math.round(baseY - PROP_FOOT_Y), PROP_CELL_W, PROP_CELL_H);
  ctx.restore();
  return true;
}
