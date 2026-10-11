import type { ItemKind } from "@/game/dungeon";
import type { PropKind } from "@/game/props";
import { loadSheet, type Sheet } from "./sheets";

/**
 * The things to smash and the loot on the floor as pixel art, made from art/props/raw by scripts/sprite-sheets.mjs:
 * public/props/<prop>.png is a strip of 3 frames (whole, cracked, breaking apart) and public/props/loot.png one row of
 * the loot in LOOT_ORDER. Every cell is PROP_CELL_W x PROP_CELL_H with the base at (PROP_FOOT_X, PROP_FOOT_Y), drawn
 * at twice the game's pixel density (like the heroes), so a PNG cell is 96 x 80. A prop not yet drawn cracked and
 * breaking apart has only the whole frame. Until a sheet exists (or while it loads) the game draws the code sprites.
 */
export const PROP_CELL_W = 48, PROP_CELL_H = 40;
export const PROP_FOOT_X = 24, PROP_FOOT_Y = 38;

/** "a" whole, "b" cracked (it has taken a blow), "c" breaking apart (shown for a moment as it breaks). */
export type PropSheetFrame = "a" | "b" | "c";
const COL: Record<PropSheetFrame, number> = { a: 0, b: 1, c: 2 };

/** The loot row's order, the same as LOOT_ORDER in scripts/sprite-sheets.mjs. */
export const LOOT_ORDER: readonly ItemKind[] = ["gold", "crystal", "oil", "chest", "vault", "hoard"];

export const propSheet = (kind: PropKind): Sheet | null => loadSheet(`props/${kind}.png`);
export const lootSheet = (): Sheet | null => loadSheet("props/loot.png");

/** PNG pixels per game pixel, read from the sheet itself. */
const densityOf = (sheet: Sheet) => Math.max(1, Math.round(sheet.image.naturalHeight / PROP_CELL_H));
/** How many frames a prop's strip holds: 3, or 1 while only the whole prop is drawn. */
export const framesOf = (sheet: Sheet) => Math.round(sheet.image.naturalWidth / (PROP_CELL_W * densityOf(sheet)));

/** Where a frame sits in a prop's strip (in game pixels), falling back to the whole frame; null if there is none to show. */
export function propCell(sheet: Sheet | null, frame: PropSheetFrame): number | null {
  if (!sheet) return null;
  if (COL[frame] < framesOf(sheet)) return COL[frame] * PROP_CELL_W;
  return frame === "c" ? null : 0;
}
export const lootCell = (kind: ItemKind) => Math.max(0, LOOT_ORDER.indexOf(kind)) * PROP_CELL_W;

/**
 * Draws one cell with its base on (x, baseY), centred on x. Returns false (drawing nothing) when the sheet is not
 * there, so the caller can fall back to the code sprite.
 */
export function drawCell(ctx: CanvasRenderingContext2D, sheet: Sheet | null, sx: number | null, x: number, baseY: number, alpha = 1) {
  if (!sheet || sx === null) return false;
  const d = densityOf(sheet);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(sheet.image, sx * d, 0, PROP_CELL_W * d, PROP_CELL_H * d, Math.round(x - PROP_FOOT_X), Math.round(baseY - PROP_FOOT_Y), PROP_CELL_W, PROP_CELL_H);
  ctx.restore();
  return true;
}
