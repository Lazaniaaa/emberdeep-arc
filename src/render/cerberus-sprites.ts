import type { Dimling, Point } from "@/game/dungeon";
import type { MobFrame } from "./mob-sheets";
import { loadSheet } from "./sheets";

/** Owner's four-direction sheet. Logical size stays independent of the 2x texture density. */
export const CERBERUS_CELL_W = 128, CERBERUS_CELL_H = 112;
export const CERBERUS_FOOT_X = 64, CERBERUS_FOOT_Y = 104, CERBERUS_TEXTURE_SCALE = 2;
export type CerberusFacing = "down" | "left" | "right" | "up";
const ROW: Record<CerberusFacing, number> = { down: 0, left: 1, right: 2, up: 3 };
const COL: Record<MobFrame, number> = { a: 0, b: 1, w: 2, s: 3 };

/** Face from the centre of the whole 2x2 body, rather than its upper-left tile. */
export function cerberusFacing(d: Dimling, player: Point): CerberusFacing {
  const middle = ((d.size ?? 2) - 1) / 2;
  const dx = player.x - d.x - middle, dy = player.y - d.y - middle;
  if (dx === 0 && dy === 0) return "down";
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}

export const cerberusFrame = (facing: CerberusFacing, frame: MobFrame) => ({
  x: COL[frame]*CERBERUS_CELL_W*CERBERUS_TEXTURE_SCALE,
  y: ROW[facing]*CERBERUS_CELL_H*CERBERUS_TEXTURE_SCALE,
});
export const cerberusSheet = () => loadSheet("bosses/cerberus.png");
