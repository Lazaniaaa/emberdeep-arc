import type { ClassId } from "./catalog";
import { CAMP_TIPS, stepInCamp } from "./camp";
import { chance, createRng, int, pick, type Rng } from "./rng";

// Ambient delvers that wander the camp so the lobby feels lived in. They are simulated:
// they are not other players, hold nothing and never touch the economy.

export type Npc = {
  id: number;
  name: string;
  kind: ClassId | "elder";
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  homeX: number;
  homeY: number;
  facing: "left" | "right" | "up" | "down";
  /** Time the last step began, for tweening. */
  movedAt: number;
  nextMove: number;
  say: string | null;
  sayUntil: number;
};

export const NPC_STEP_MS = 320;
const ROAM_RADIUS = 6;

export const NPC_NAMES = [
  "quillfox", "mossbite", "ashwren", "dunmar", "pipkin", "o_lantern", "tessel", "brannoch", "velk", "juniper9",
  "hollowjack", "ember_kit",
];

const CLASS_ORDER: ClassId[] = ["prospector", "seer", "lamplighter", "pathfinder", "duelist", "scavenger"];

const CHATTER = [
  "Two flasks and a dream.", "Anyone beaten the hound yet?", "Bank it before you spend it.",
  "Ward Charm first, dagger second.", "The fire never goes out.", "The Vault is looking heavy.",
  "One more descent...", "Who took my key?", "Depth five, here I come.", "Mind the dimlings.",
];

/** The camp elder stands by the gate and hands out tips. */
export const ELDER_HOME = { x: 22, y: 11 };

export type Crowd = { npcs: Npc[]; rng: Rng };

const HOMES: [number, number][] = [
  [24, 22], [21, 18], [26, 18], [23, 11], [26, 12], [11, 12], [32, 14], [24, 10], [11, 11], [36, 12], [18, 15], [36, 19],
];

export function createCrowd(seed = 7, now = 0): Crowd {
  const rng = createRng(seed);
  const npcs: Npc[] = HOMES.map(([x, y], i) => ({
    id: i + 1, name: NPC_NAMES[i % NPC_NAMES.length], kind: CLASS_ORDER[i % CLASS_ORDER.length],
    x, y, fromX: x, fromY: y, homeX: x, homeY: y, facing: "down", movedAt: -1e9,
    nextMove: now + int(rng, 300, 1800), say: null, sayUntil: 0,
  }));
  npcs.push({
    id: 100, name: "Old Ember", kind: "elder", x: ELDER_HOME.x, y: ELDER_HOME.y, fromX: ELDER_HOME.x, fromY: ELDER_HOME.y,
    homeX: ELDER_HOME.x, homeY: ELDER_HOME.y, facing: "down", movedAt: -1e9, nextMove: now + 2500, say: CAMP_TIPS[0], sayUntil: now + 6000,
  });
  return { npcs, rng };
}

/** Advances the crowd to `now`. `avoid` is any cell that must stay free, such as the player's. */
export function advanceCrowd(crowd: Crowd, now: number, avoid: { x: number; y: number }[] = []) {
  const { npcs, rng } = crowd;
  for (const npc of npcs) {
    if (npc.say && now > npc.sayUntil) npc.say = null;
    if (now < npc.nextMove) continue;

    if (npc.kind === "elder") {
      const at = npc.say ? CAMP_TIPS.indexOf(npc.say) : -1;
      npc.say = CAMP_TIPS[(at + 1) % CAMP_TIPS.length];
      npc.sayUntil = now + 6500;
      npc.nextMove = now + 9000;
      continue;
    }

    npc.nextMove = now + int(rng, 700, 2200);
    if (chance(rng, 0.05) && !npc.say) { npc.say = pick(rng, CHATTER); npc.sayUntil = now + 3800; }
    if (!chance(rng, 0.6)) continue;

    const [dx, dy] = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
    const {x,y} = stepInCamp(npc,dx,dy);
    if (x === npc.x && y === npc.y) continue;
    if (Math.abs(x - npc.homeX) + Math.abs(y - npc.homeY) > ROAM_RADIUS) continue;
    if (npcs.some(o => o !== npc && (o.x === x && o.y === y))) continue;
    if (avoid.some(a => a.x === x && a.y === y)) continue;
    npc.fromX = npc.x; npc.fromY = npc.y;
    npc.x = x; npc.y = y;
    npc.movedAt = now;
    npc.facing = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
  }
}

/** Where to draw the NPC right now, between its last cell and its current one. */
export function npcPosition(npc: Npc, now: number) {
  const k = Math.min(1, Math.max(0, (now - npc.movedAt) / NPC_STEP_MS));
  return { x: npc.fromX + (npc.x - npc.fromX) * k, y: npc.fromY + (npc.y - npc.fromY) * k, walking: k < 1 };
}
