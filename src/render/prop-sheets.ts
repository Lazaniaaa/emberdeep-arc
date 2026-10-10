import type { ItemKind } from "@/game/dungeon";
import type { PropKind } from "@/game/props";
import { loadSheet, type Sheet } from "./sheets";

/**
 * The things to smash and the loot on the floor as pixel art, made from art/props/raw by scripts/sprite-sheets.mjs:
 * public/props/<prop>.png is a strip of 3 frames (whole, cracked, breaking apart) and public/props/loot.png one row of
 * the loot in LOOT_ORDER. Every cell is PROP_CELL_W x PROP_CELL_H with the base at (PROP_FOOT_X, PROP_FOOT_Y), drawn
 * one pixel per game pixel like the creatures. Until a sheet exists (or while it loads) the game draws the code sprites.
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

/** Where a frame sits in a prop's strip, or a loot item in the loot row. */
export const propCell = (frame: PropSheetFrame) => COL[frame] * PROP_CELL_W;
export const lootCell = (kind: ItemKind) => Math.max(0, LOOT_ORDER.indexOf(kind)) * PROP_CELL_W;

/**
 * Draws one cell with its base on (x, baseY), centred on x. Returns false (drawing nothing) when the sheet is not
 * there, so the caller can fall back to the code sprite.
 */
export function drawCell(ctx: CanvasRenderingContext2D, sheet: Sheet | null, sx: number, x: number, baseY: number, alpha = 1) {
  if (!sheet) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(sheet.image, sx, 0, PROP_CELL_W, PROP_CELL_H, Math.round(x - PROP_FOOT_X), Math.round(baseY - PROP_FOOT_Y), PROP_CELL_W, PROP_CELL_H);
  ctx.restore();
  return true;
}
