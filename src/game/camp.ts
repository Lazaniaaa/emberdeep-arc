// The lobby is a walkable camp. Buildings are solid; standing next to one lets you open it.

export const CAMP_W = 40;
export const CAMP_H = 26;

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
  { id: "gate", x: 20, y: 5, name: "Dungeon Gate", blurb: "Pick who descends, buy oil and an entry key, then light the lantern." },
  { id: "altar", x: 9, y: 9, name: "Ember Altar", blurb: "Mint Delvers, lock them for stronger perks, or send them on expeditions." },
  { id: "armory", x: 31, y: 9, name: "Armory", blurb: "Weapons, potions and crafting with crystals." },
  { id: "board", x: 9, y: 19, name: "Draw Board", blurb: "The weekly draw for free Delver mints, your tickets and the passes." },
  { id: "ledger", x: 31, y: 19, name: "Vault", blurb: "The reward round, where every dollar goes, and your session." },
  { id: "guide", x: 16, y: 18, name: "Welcome Board", blurb: "How a descent works, in four steps." },
  { id: "hall", x: 24, y: 18, name: "Hall of Delvers", blurb: "Your own records, and the Hall of Descents on Arc." },
];

export type CampProp = { x: number; y: number; kind: "fire" | "lamp" | "crystal" | "mushroom" | "crate" | "rock" };

export const CAMP_PROPS: readonly CampProp[] = [
  { x: 20, y: 14, kind: "fire" },
  { x: 19, y: 8, kind: "lamp" }, { x: 22, y: 8, kind: "lamp" },
  { x: 14, y: 14, kind: "lamp" }, { x: 27, y: 14, kind: "lamp" },
  { x: 4, y: 5, kind: "crystal" }, { x: 35, y: 5, kind: "crystal" },
  { x: 4, y: 21, kind: "crystal" }, { x: 35, y: 21, kind: "crystal" },
  { x: 15, y: 10, kind: "mushroom" }, { x: 26, y: 10, kind: "mushroom" },
  { x: 13, y: 22, kind: "mushroom" }, { x: 27, y: 22, kind: "mushroom" },
  { x: 12, y: 7, kind: "crate" }, { x: 13, y: 7, kind: "crate" }, { x: 28, y: 7, kind: "crate" },
  { x: 6, y: 11, kind: "rock" }, { x: 33, y: 11, kind: "rock" }, { x: 7, y: 22, kind: "rock" },
  { x: 32, y: 22, kind: "rock" }, { x: 17, y: 3, kind: "rock" }, { x: 23, y: 3, kind: "rock" },
];

export const CAMP_SPAWN = { x: 20, y: 17 };
export const PLAZA = { x: 20, y: 14, rx: 7, ry: 5 };

/** How many tiles of the camp the camera shows. */
export const VIEW_W = 22;
export const VIEW_H = 13;

function hash(x: number, y: number) {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export { hash as campHash };

let terrain: Terrain[] | null = null;

function buildTerrain() {
  const t = new Array<Terrain>(CAMP_W * CAMP_H).fill("moss");
  const set = (x: number, y: number, kind: Terrain) => {
    if (x >= 0 && y >= 0 && x < CAMP_W && y < CAMP_H) t[y * CAMP_W + x] = kind;
  };
  for (let y = 0; y < CAMP_H; y++) {
    for (let x = 0; x < CAMP_W; x++) {
      const edge = x < 2 || y < 2 || x >= CAMP_W - 2 || y >= CAMP_H - 2;
      const ridge = x === 2 || y === 2 || x === CAMP_W - 3 || y === CAMP_H - 3;
      if (edge || (ridge && hash(x, y) > 0.55)) set(x, y, "cliff");
    }
  }
  // Ponds sit between the paths, never on them.
  for (const [x0, y0, x1, y1] of [[4, 12, 7, 16], [33, 12, 36, 16], [12, 4, 14, 6], [26, 4, 28, 6]]) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, "water");
  }
  // Flagstone paths: from the plaza sideways, then up or down to the door of each building.
  for (const s of STATIONS) {
    const cx = PLAZA.x, cy = PLAZA.y;
    const sx = Math.min(cx, s.x), ex = Math.max(cx, s.x);
    for (let x = sx; x <= ex + 1; x++) for (let w = 0; w < 2; w++) set(x, cy + w, "path");
    const top = Math.min(cy, s.y + 1), bottom = Math.max(cy, s.y + 1);
    for (let y = top; y <= bottom; y++) for (let w = 0; w < 2; w++) set(s.x + w, y, "path");
  }
  for (let y = 0; y < CAMP_H; y++) {
    for (let x = 0; x < CAMP_W; x++) {
      const d = ((x - PLAZA.x) / PLAZA.rx) ** 2 + ((y - PLAZA.y) / PLAZA.ry) ** 2;
      if (d <= 1 && t[y * CAMP_W + x] !== "cliff") set(x, y, "plaza");
    }
  }
  return t;
}

export function terrainAt(x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= CAMP_W || y >= CAMP_H) return "cliff";
  terrain ??= buildTerrain();
  return terrain[y * CAMP_W + x];
}

export function isCampWall(x: number, y: number) {
  const kind = terrainAt(x, y);
  return kind === "cliff" || kind === "water";
}

export function stationAt(x: number, y: number) {
  return STATIONS.find(s => s.x === x && s.y === y) ?? null;
}

export function campSolid(x: number, y: number) {
  return isCampWall(x, y) || stationAt(x, y) !== null || CAMP_PROPS.some(p => p.x === x && p.y === y);
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

/** Cells to walk until you stand next to a building. Empty when you already do. */
export function pathToStation(from: Cell, station: Station) {
  const touching = (c: Cell) => Math.abs(c.x - station.x) + Math.abs(c.y - station.y) === 1;
  if (touching(from)) return [];
  return walk(from, touching);
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
