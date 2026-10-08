import type { Point } from "@/game/dungeon";
import { attackTiles } from "@/game/enemy-ai";
import { propsOf, type RunEvent, type RunState } from "@/game/run";
import type { Fx } from "./fx";
import type { HeroDir, HeroFrame } from "./animal-sprites";

/**
 * How the delver moves between turns, and the effects a turn leaves behind. The game resolves a turn at once; these put
 * it back in order for the eye: the delver winds up, the blow lands with a short lunge, then the numbers rise from what
 * was hit. Everything here is computed from the game state and the clock, with no canvas.
 */

/** How long the delver holds the wind-up before the blow lands. Effects of the blow start then. */
export const HERO_WINDUP_MS = 90;
/** How long the blow and its lunge last. */
export const HERO_STRIKE_MS = 170;
/** How long the red flash lasts when a creature's blow lands on the delver. */
export const HERO_HURT_MS = 260;
/** How far the lunge reaches, in canvas pixels. */
const LUNGE_PX = 5;

export const STEP: Record<HeroDir, Point> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

export type HeroMotion = { frame: HeroFrame; offX: number; offY: number; flash: number };

/**
 * The delver's frame at `time`. A blow struck at `attackAt` winds up, then lands with a lunge toward `dir`; otherwise a
 * delver crossing a tile shows the step of `stride` (it alternates tile by tile) and one standing still shows "a".
 * `flash` tints the delver red for a moment after `hurtAt`. `still` (reduced motion) keeps the frames but drops the lunge.
 */
export function heroMotion(time: number, dir: HeroDir, walking: boolean, stride: number, attackAt: number, hurtAt: number, still: boolean): HeroMotion {
  const motion: HeroMotion = { frame: walking ? (stride % 2 ? "b" : "c") : "a", offX: 0, offY: 0, flash: 0 };
  const since = time - attackAt;
  if (since >= 0 && since < HERO_WINDUP_MS) motion.frame = "w";
  else if (since >= HERO_WINDUP_MS && since < HERO_WINDUP_MS + HERO_STRIKE_MS) {
    motion.frame = "s";
    if (!still) {
      const reach = Math.round(Math.sin((Math.PI * (since - HERO_WINDUP_MS)) / HERO_STRIKE_MS) * LUNGE_PX);
      motion.offX = STEP[dir].x * reach;
      motion.offY = STEP[dir].y * reach;
    }
  }
  const hurt = time - hurtAt;
  if (hurt >= 0 && hurt < HERO_HURT_MS) motion.flash = still ? 0.45 : 0.65 * (1 - hurt / HERO_HURT_MS);
  return motion;
}

/** The events of a turn in which the delver struck something. */
const BLOWS: readonly RunEvent[] = ["hit", "kill", "boss", "smash", "break"];

export type TurnEffects = {
  fx: Fx[];
  /** The delver struck this turn. */
  attack: boolean;
  /** A creature's blow or Cerberus took light from the delver this turn. */
  hurt: boolean;
};

/**
 * What the eye should see of one turn, from the state before and after it: the arc of the delver's blow, the damage it
 * did, a puff where a creature fell or a prop broke, a burst on every tile a creature's blow landed on, and whether the
 * delver stepped out of it or a ward turned it. A turn on another floor or another descent shows nothing.
 */
export function turnEffects(prev: RunState, next: RunState, at: number): TurnEffects {
  const out: TurnEffects = { fx: [], attack: false, hurt: next.events.includes("drain") };
  if (prev === next || prev.seed !== next.seed || prev.runId !== next.runId || prev.depth !== next.depth) return { ...out, hurt: false };

  // The delver's blow lands after the wind-up, and so does all it does.
  const land = at + HERO_WINDUP_MS;
  out.attack = next.events.some(e => BLOWS.includes(e));
  if (out.attack) {
    const { x: dx, y: dy } = STEP[next.player.facing];
    out.fx.push({ kind: "slash", x: next.player.x + dx, y: next.player.y + dy, dx, dy, at: land });
  }
  const raging = (prev.rage ?? 0) > 0;
  const damage = raging ? "#ff7a5a" : "#ffffff";

  const after = new Map(next.floor.dimlings.map(d => [d.id, d]));
  for (const d of prev.floor.dimlings) {
    const now = after.get(d.id);
    // A boss stands on four tiles; its effects go in the middle of them.
    const mid = d.boss ? 0.5 : 0;
    if (!now) {
      out.fx.push({ kind: "text", x: d.x + mid, y: d.y, text: `-${d.hp}`, color: damage, at: land });
      out.fx.push({ kind: "puff", x: d.x + mid, y: d.y + mid, color: d.boss ? "#ff7a1a" : "#d9d0ff", at: land });
      continue;
    }
    if (now.hp < d.hp) out.fx.push({ kind: "text", x: now.x + mid, y: now.y, text: `-${d.hp - now.hp}`, color: damage, at: land });
    if (d.phase === "windup" && now.phase === "recovery") {
      // The blow lands now: a burst on each tile it covered (the aim was cleared when it struck, so it is read from before).
      const tiles = attackTiles(prev.floor, d);
      for (const t of tiles) out.fx.push({ kind: "impact", x: t.x, y: t.y, at });
      // Words over the delver go half a tile higher, above the head.
      const on = (p: Point) => tiles.some(t => t.x === p.x && t.y === p.y);
      if (on(next.player) && (prev.ward > 0 || next.ward > 0)) {
        out.fx.push({ kind: "text", x: next.player.x, y: next.player.y - 0.5, text: "WARD", color: "#7cf7ff", at });
      } else if (!on(next.player) && on(prev.player)) {
        out.fx.push({ kind: "text", x: next.player.x, y: next.player.y - 0.5, text: "DODGE", color: "#ccff00", at });
      }
    }
  }

  // Props have no turns of their own, so whatever they lost the delver's blow took.
  const key = (p: Point) => `${p.x},${p.y}`;
  const standing = new Map(propsOf(next.floor).map(p => [key(p), p]));
  for (const p of propsOf(prev.floor)) {
    const now = standing.get(key(p));
    if (!now) {
      out.fx.push({ kind: "puff", x: p.x, y: p.y, color: "#c89a5a", at: land });
    } else if (now.hp < p.hp) {
      out.fx.push({ kind: "text", x: p.x, y: p.y, text: `-${p.hp - now.hp}`, color: "#e8c070", at: land });
    }
  }
  return out;
}
