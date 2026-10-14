// The painted lobby. Footprints come from the walk map; station coordinates are OPEN door tiles.

export const CAMP_W = 48;
export const CAMP_H = 32;

export type Facing = "left" | "right" | "up" | "down";
export type StationId = "gate" | "altar" | "armory" | "board" | "ledger" | "guide" | "hall";
export type Terrain = "moss" | "path" | "plaza" | "water" | "cliff";

export type Station = {
  id: StationId;
  x: number;
  y: number;
  name: string;
  /** One line shown under the name when the panel opens. */
  blurb: string;
};

export const STATIONS: readonly Station[] = [
  { id: "gate", x: 24, y: 9, name: "Dungeon Gate", blurb: "Pick who descends, buy oil and an entry key, then light the lantern." },
  { id: "altar", x: 7, y: 20, name: "Ember Altar", blurb: "Mint Delvers, lock them for stronger perks, or send them on expeditions." },
  { id: "armory", x: 36, y: 11, name: "Armory", blurb: "Weapons, potions and crafting with crystals." },
  { id: "board", x: 37, y: 23, name: "Draw Board", blurb: "The weekly draw for free Delver mints, your tickets and the passes." },
  { id: "ledger", x: 42, y: 17, name: "Vault", blurb: "The reward round, where every dollar goes, and your session." },
  { id: "guide", x: 26, y: 23, name: "Welcome Board", blurb: "How a descent works, in four steps." },
  { id: "hall", x: 10, y: 11, name: "Hall of Delvers", blurb: "Your own records, and the Hall of Descents on Arc." },
];

export type CampProp = { x: number; y: number; kind: "fire" | "lamp" | "crystal" | "mushroom" | "crate" | "rock" };

/** Old code sprites are used only while the painting is loading or unavailable. */
export const CAMP_PROPS: readonly CampProp[] = [
  { x: 24, y: 17, kind: "fire" },
  { x: 19, y: 14, kind: "lamp" }, { x: 29, y: 14, kind: "lamp" },
  { x: 21, y: 21, kind: "lamp" }, { x: 26, y: 21, kind: "lamp" },
  { x: 4, y: 8, kind: "crystal" }, { x: 34, y: 3, kind: "crystal" },
  { x: 15, y: 27, kind: "crystal" }, { x: 44, y: 28, kind: "crystal" },
];

export const CAMP_SPAWN = { x: 24, y: 24 };
export const PLAZA = { x: 24, y: 17, rx: 7, ry: 6 };

/** How many tiles of the camp the camera shows. */
export const VIEW_W = 22;
export const VIEW_H = 13;

function hash(x: number, y: number) {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export { hash as campHash };

/** Traced against art/lobby/camp-v1-grid.png. . ground, # rock/object base, ~ water.
 * Inspect the foot anchor (x * 32 + 16, y * 32 + 30), not the tile centre or a hanging lamp.
 * Upper parts of tall objects are NOT solid: their cropped artwork occludes delvers behind them.
 * Keep these 32 rows literal so a collision correction remains a one-character edit.
 */
export const CAMP_WALK_MAP: readonly string[] = [
  "################################################", // 00
  "################################################", // 01
  "################################################", // 02
  "################################################", // 03
  "############################################~~##", // 04
  "###########################################~~~~#", // 05
  "###########################################~~~~#", // 06
  "###########################################~~~~#", // 07
  "######################....#################~~~~#", // 08
  "#########...###########....#################~~~#", // 09
  "#########...##########.....####.#####.##########", // 10
  "#####........###.####.......#......#.....#######", // 11
  "#########..........###......##.......#.#########", // 12
  "###########........####...####......############", // 13
  "############....#...#......##......#############", // 14
  "############..#####...#####........#############", // 15
  "############..#####..######........#############", // 16
  "#############.############..####....####....####", // 17
  "############..###########...####..######..#...##", // 18
  "##########....####.###....#####...#########...##", // 19
  "###................###....###.....##########..##", // 20
  "####................##....##......##########.###", // 21
  "###########..................#....##########.###", // 22
  "####~~#############........####.......#####..###", // 23
  "####~~#################..######.............####", // 24
  "###~~~~~~~~~####################################", // 25
  "##~~~~~~~~~~~###################################", // 26
  "##~~#~~~~#~~~###################################", // 27
  "###~~~~~##~~~~##################################", // 28
  "#####~~~~~~~~~##################################", // 29
  "#######~~~~~####################################", // 30
  "################################################", // 31
];

export function terrainAt(x: number, y: number): Terrain {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= CAMP_W || y >= CAMP_H) return "cliff";
  const ch = CAMP_WALK_MAP[y][x];
  if (ch === "#") return "cliff";
  if (ch === "~") return "water";
  const d = ((x - PLAZA.x) / PLAZA.rx) ** 2 + ((y - PLAZA.y) / PLAZA.ry) ** 2;
  return d <= 1 ? "plaza" : "path";
}

export function isCampWall(x: number, y: number) {
  const kind = terrainAt(x, y);
  return kind === "cliff" || kind === "water";
}

export function stationAt(x: number, y: number) {
  return STATIONS.find(s => s.x === x && s.y === y) ?? null;
}

export function campSolid(x: number, y: number) {
  return isCampWall(x, y);
}

const DELTA: Record<Facing, { dx: number; dy: number }> = {
  left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }, up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
};
const STEPS = Object.values(DELTA);

export function facingOf(dx: number, dy: number, previous: Facing): Facing {
  if (dx < 0) return "left";
  if (dx > 0) return "right";
  if (dy < 0) return "up";
  if (dy > 0) return "down";
  return previous;
}

/** One step in the camp. A wall, prop or building leaves you where you are. */
export function stepInCamp(pos: { x: number; y: number }, dx: number, dy: number) {
  const x = pos.x + dx, y = pos.y + dy;
  return campSolid(x, y) ? { x: pos.x, y: pos.y } : { x, y };
}

/** The building you can open from here: the one you face, otherwise any that touches you. */
export function stationNear(pos: { x: number; y: number }, facing: Facing) {
  const door = stationAt(pos.x, pos.y);
  if (door) return door;
  const ahead = DELTA[facing];
  const faced = stationAt(pos.x + ahead.dx, pos.y + ahead.dy);
  if (faced) return faced;
  for (const d of STEPS) {
    const s = stationAt(pos.x + d.dx, pos.y + d.dy);
    if (s) return s;
  }
  return null;
}

type Cell = { x: number; y: number };

/** Shortest walk (BFS) to any cell that satisfies `done`. Excludes the start. Null when unreachable. */
function walk(from: Cell, done: (c: Cell) => boolean, blocked: (x: number, y: number) => boolean = campSolid) {
  const key = (c: Cell) => c.y * CAMP_W + c.x;
  const prev = new Map<number, Cell | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (head > 0 && done(cur)) {
      const path: Cell[] = [];
      for (let c: Cell | null = cur; c && (c.x !== from.x || c.y !== from.y); c = prev.get(key(c)) ?? null) path.unshift(c);
      return path;
    }
    for (const d of STEPS) {
      const next = { x: cur.x + d.dx, y: cur.y + d.dy };
      if (prev.has(key(next)) || blocked(next.x, next.y)) continue;
      prev.set(key(next), cur);
      queue.push(next);
    }
  }
  return null;
}

/** Cells to walk to reach a tapped tile. A tapped wall or building yields null. */
export function pathTo(from: Cell, to: Cell) {
  if (from.x === to.x && from.y === to.y) return [];
  if (campSolid(to.x, to.y)) return null;
  return walk(from, c => c.x === to.x && c.y === to.y);
}

/** Cells to walk to the painted door. Empty when already at the door or touching it. */
export function pathToStation(from: Cell, station: Station) {
  const touching = (c: Cell) => Math.abs(c.x - station.x) + Math.abs(c.y - station.y) <= 1;
  if (touching(from)) return [];
  return pathTo(from, { x: station.x, y: station.y });
}

/** Facing that looks at the building from the last cell of a walk. */
export function facingStation(from: Cell, station: Station): Facing {
  return facingOf(Math.sign(station.x - from.x), Math.sign(station.y - from.y), "up");
}

export const CAMP_TIPS = [
  "Keep the way home lit. Gold left in the dark feeds the ones who return.",
  "A Ward Charm makes Cerberus harmless for fifteen steps.",
  "One key, one descent. Buy oil separately at the gate.",
  "Gold only counts once you carry it out alive.",
  "A bigger share of the gold is a bigger share of the pool.",
];
