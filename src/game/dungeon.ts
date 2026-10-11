import { BOSS_DEPTH, BOSS_HP, BOSS_SIZE, HP_SCALE, enemyCount, floorHeight, floorScale, floorWidth } from "./config";
import { enemyDef, pickEnemy, type EnemySpecies } from "./enemies";
import { PROPS, propCounts, propDef, type PropKind } from "./props";
import { tuning } from "./tuning";
import { chance, int, type Rng } from "./rng";

export const WALL = 0;
export const FLOOR = 1;

export type Point = { x: number; y: number };

/** A fixed pseudo-random number for a tile: the renderer picks tile variants and decorations with it. */
export function tileHash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Whether a floor tile carries a stone or bones drawn into the floor. Props never stand on one: once a prop broke, the
 * decoration would show where it stood and look like its remains.
 */
export const hasFloorDecor = (x: number, y: number) => tileHash(x + 41, y + 73) % 12 === 0;

export type ItemKind = "gold" | "crystal" | "oil" | "chest" | "vault" | "hoard";
export type Item = Point & { id: number; kind: ItemKind };

/** Something to smash (see props.ts). It fills its tile until it breaks. */
export type Prop = Point & { id: number; kind: PropKind; hp: number; maxHp: number };

export type DimlingPhase = "idle" | "windup" | "recovery";

/**
 * A creature. `x, y` is the top-left tile: ordinary creatures fill one tile, the boss fills `size` x `size`.
 * A creature that has noticed the delver winds up before it hits (see enemies.ts); the fields after `size` track that.
 * Descents saved before creatures had species omit them, and are read as idle Waxlings (id "wickgnaw").
 */
export type Dimling = Point & {
  id: number; hp: number; maxHp: number; awake: boolean; boss?: boolean; size?: number;
  species?: EnemySpecies;
  phase?: DimlingPhase;
  /** Turns left before the blow lands, while winding up. */
  windupLeft?: number;
  /** Turns left recovering after a blow. */
  cooldown?: number;
  /** For a creature that keeps its distance: turns left before its next step back. */
  rest?: number;
  /** The direction a line attack is aimed, fixed when the wind-up starts. */
  aim?: Point | null;
};

export type FloorTheme = "catacombs" | "mycelium" | "cinderworks" | "hollowglass";

export type Floor = {
  depth: number;
  theme: FloorTheme;
  roomCount: number;
  w: number;
  h: number;
  tiles: number[];
  seen: number[];
  spawn: Point;
  stairs: Point;
  items: Item[];
  dimlings: Dimling[];
  /** Things to smash. Descents saved before they existed have none. */
  props: Prop[];
  revealed: boolean;
};

/** Index of a tile in `floor.tiles` and `floor.seen`. Floors 1-3 are wider than the rest, so the floor supplies the width. */
export const idx = (floor: { w: number }, x: number, y: number) => y * floor.w + x;

const manhattan = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Every tile a creature stands on. */
export function footprint(d: Point & { size?: number }): Point[] {
  const size = d.size ?? 1;
  const cells: Point[] = [];
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) cells.push({ x: d.x + dx, y: d.y + dy });
  return cells;
}

/** Walking distance-in-a-straight-line from a point to the nearest tile of a creature. 1 means it is touching. */
export function dimlingDistance(d: Point & { size?: number }, p: Point) {
  return Math.min(...footprint(d).map(c => manhattan(c, p)));
}

export function isFloor(floor: Floor, x: number, y: number) {
  return x >= 0 && y >= 0 && x < floor.w && y < floor.h && floor.tiles[idx(floor, x, y)] === FLOOR;
}

const DIRS: readonly Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

type RoomSlot = "A" | "B" | "C" | "D" | "E" | "F";
type RoomLink = { from: RoomSlot; to: RoomSlot; via?: Point[] };
type RoomLayout = { rooms: RoomSlot[]; links: RoomLink[]; spawn: RoomSlot; stairs: RoomSlot };
type Rect = { x: number; y: number; w: number; h: number };
type AuthoredRoute = { points: Point[]; width: number };
type AuthoredMap = {
  roomCount: number;
  rooms: Rect[];
  routes: AuthoredRoute[];
  spawn: Point;
  stairs: Point;
};

const route = (points: Point[], width = 2): AuthoredRoute => ({ points, width });

/** Walkable areas traced against the seven illustrated floors: 34×22 tiles for floors 1-3, 27×17 for the rest. */
function authoredMap(depth: number): AuthoredMap | null {
  switch (depth) {
    case 1:
      return {
        roomCount: 2,
        rooms: [{ x: 3, y: 7, w: 7, h: 8 }, { x: 22, y: 6, w: 10, h: 10 }],
        routes: [route([{ x: 9, y: 10 }, { x: 22, y: 10 }], 3)],
        spawn: { x: 5, y: 10 }, stairs: { x: 26, y: 10 },
      };
    case 2:
      return {
        roomCount: 3,
        rooms: [
          { x: 3, y: 5, w: 7, h: 9 }, { x: 15, y: 6, w: 5, h: 6 }, { x: 25, y: 6, w: 7, h: 9 },
          { x: 16, y: 17, w: 4, h: 2 },
        ],
        routes: [
          route([{ x: 9, y: 9 }, { x: 15, y: 9 }], 2),
          route([{ x: 19, y: 10 }, { x: 25, y: 10 }], 2),
          route([{ x: 18, y: 12 }, { x: 18, y: 17 }], 2),
        ],
        spawn: { x: 5, y: 9 }, stairs: { x: 28, y: 9 },
      };
    case 3:
      return {
        roomCount: 3,
        rooms: [
          { x: 3, y: 5, w: 9, h: 8 }, { x: 22, y: 4, w: 10, h: 6 }, { x: 10, y: 16, w: 16, h: 3 },
        ],
        routes: [
          route([{ x: 11, y: 7 }, { x: 22, y: 7 }], 2),
          route([{ x: 9, y: 12 }, { x: 9, y: 17 }], 3),
          route([{ x: 26, y: 9 }, { x: 26, y: 15 }], 3),
        ],
        spawn: { x: 5, y: 9 }, stairs: { x: 26, y: 7 },
      };
    case 4:
      return {
        roomCount: 4,
        rooms: [
          { x: 2, y: 6, w: 5, h: 5 }, { x: 11, y: 2, w: 5, h: 4 },
          { x: 20, y: 6, w: 5, h: 5 }, { x: 11, y: 12, w: 5, h: 3 },
          { x: 11, y: 7, w: 5, h: 3 },
        ],
        routes: [
          route([{ x: 13, y: 5 }, { x: 13, y: 7 }], 3),
          route([{ x: 6, y: 8 }, { x: 11, y: 8 }], 2),
          route([{ x: 15, y: 8 }, { x: 20, y: 8 }], 2),
          route([{ x: 13, y: 9 }, { x: 13, y: 12 }], 3),
        ],
        spawn: { x: 4, y: 8 }, stairs: { x: 22, y: 8 },
      };
    case 5:
      return {
        roomCount: 4,
        rooms: [
          { x: 2, y: 5, w: 7, h: 7 }, { x: 11, y: 2, w: 6, h: 4 },
          { x: 19, y: 5, w: 7, h: 7 }, { x: 11, y: 12, w: 6, h: 3 },
          { x: 12, y: 7, w: 4, h: 4 },
        ],
        routes: [
          route([{ x: 8, y: 8 }, { x: 12, y: 8 }], 2),
          route([{ x: 15, y: 8 }, { x: 19, y: 8 }], 2),
          route([{ x: 13, y: 5 }, { x: 13, y: 7 }], 3),
          route([{ x: 13, y: 10 }, { x: 13, y: 12 }], 3),
        ],
        spawn: { x: 4, y: 8 }, stairs: { x: 22, y: 8 },
      };
    case 6:
      return {
        roomCount: 5,
        rooms: [
          { x: 3, y: 6, w: 4, h: 5 }, { x: 11, y: 2, w: 6, h: 3 },
          { x: 11, y: 7, w: 6, h: 4 }, { x: 11, y: 12, w: 6, h: 3 },
          { x: 20, y: 6, w: 6, h: 5 },
        ],
        routes: [
          route([{ x: 6, y: 8 }, { x: 11, y: 8 }], 2),
          route([{ x: 13, y: 4 }, { x: 13, y: 7 }], 3),
          route([{ x: 16, y: 8 }, { x: 20, y: 8 }], 2),
          route([{ x: 13, y: 10 }, { x: 13, y: 12 }], 3),
        ],
        spawn: { x: 4, y: 8 }, stairs: { x: 22, y: 8 },
      };
    case 7:
      return {
        roomCount: 1,
        rooms: [{ x: 8, y: 3, w: 11, h: 10 }, { x: 10, y: 13, w: 7, h: 1 }],
        routes: [route([{ x: 13, y: 13 }, { x: 13, y: 14 }], 3)],
        spawn: { x: 13, y: 14 }, stairs: { x: 13, y: 3 },
      };
    default:
      return null;
  }
}

const ROOM_CENTERS: Record<RoomSlot, Point> = {
  A: { x: 4, y: 4 }, B: { x: 13, y: 4 }, C: { x: 22, y: 4 },
  D: { x: 4, y: 12 }, E: { x: 13, y: 12 }, F: { x: 22, y: 12 },
};

// Floor geometry grows in readable steps: a short route, a turn, loops, then a compact hub.
// Depths beyond the authored boss floor reuse the five-room topology.
function layoutForDepth(depth: number): RoomLayout {
  if (depth <= 1) return {
    rooms: ["A", "B"], spawn: "A", stairs: "B",
    links: [{ from: "A", to: "B" }],
  };
  if (depth === 2) return {
    rooms: ["A", "C", "D"], spawn: "A", stairs: "C",
    links: [{ from: "A", to: "C" }, { from: "A", to: "D" }],
  };
  if (depth === 3) return {
    rooms: ["A", "C", "D"], spawn: "A", stairs: "C",
    links: [
      { from: "A", to: "C" },
      { from: "A", to: "D" },
      { from: "D", to: "C", via: [{ x: 22, y: 12 }] },
    ],
  };
  if (depth === 4) return {
    rooms: ["A", "B", "D", "E"], spawn: "A", stairs: "E",
    links: [
      { from: "A", to: "B" }, { from: "B", to: "E" },
      { from: "E", to: "D" }, { from: "D", to: "A" },
    ],
  };
  if (depth === 5) return {
    rooms: ["A", "B", "D", "E"], spawn: "A", stairs: "E",
    links: [
      { from: "A", to: "B" }, { from: "B", to: "E" },
      { from: "E", to: "D" }, { from: "D", to: "A" },
      // A cross-cut between the upper and lower corridors creates a second route choice.
      { from: "B", to: "D", via: [{ x: 9, y: 4 }, { x: 9, y: 12 }] },
    ],
  };
  return {
    rooms: ["A", "B", "C", "E", "F"], spawn: "A", stairs: "F",
    links: [
      { from: "A", to: "B" }, { from: "B", to: "C" },
      { from: "C", to: "F" }, { from: "F", to: "E" },
      { from: "E", to: "B" },
    ],
  };
}

export function themeForDepth(depth: number): FloorTheme {
  const themes: FloorTheme[] = ["catacombs", "mycelium", "cinderworks", "hollowglass"];
  return themes[Math.floor((Math.max(1, depth) - 1) / 2) % themes.length];
}

export function distances(floor: Floor, from: Point) {
  const dist = new Array<number>(floor.w * floor.h).fill(-1);
  const queue: Point[] = [from];
  dist[idx(floor, from.x, from.y)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const d of DIRS) {
      const nx = p.x + d.x, ny = p.y + d.y;
      if (!isFloor(floor, nx, ny) || dist[idx(floor, nx, ny)] !== -1) continue;
      dist[idx(floor, nx, ny)] = dist[idx(floor, p.x, p.y)] + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

export type FloorOptions = { findPct: number };

export function generateFloor(rng: Rng, depth: number, options: FloorOptions): Floor {
  const w = floorWidth(depth), h = floorHeight(depth);
  const at = (x: number, y: number) => y * w + x;
  const tiles = new Array<number>(w * h).fill(WALL);
  const authored = authoredMap(depth);
  const layout = authored ? null : layoutForDepth(depth);
  const mirror = !authored && chance(rng, 0.5);
  const mirrorPoint = (p: Point): Point => ({ x: mirror ? w - 1 - p.x : p.x, y: p.y });
  const centers = {} as Record<RoomSlot, Point>;
  if (layout) for (const slot of layout.rooms) centers[slot] = mirrorPoint(ROOM_CENTERS[slot]);
  const carve = (x: number, y: number) => {
    const bossEntrance = depth === 7 && y === h - 1 && x >= 12 && x <= 14;
    if (bossEntrance || (x >= 1 && y >= 1 && x < w - 1 && y < h - 1)) tiles[at(x, y)] = FLOOR;
  };

  let spawn: Point;
  let stairs: Point;
  if (authored) {
    for (const room of authored.rooms) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) carve(x, y);
      }
    }
    for (const path of authored.routes) {
      const offsetStart = -Math.floor(path.width / 2);
      for (let i = 1; i < path.points.length; i++) {
        const from = path.points[i - 1], to = path.points[i];
        if (from.x !== to.x && from.y !== to.y) throw new Error("Dungeon room links must use orthogonal segments");
        const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
        const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
        for (let step = 0; step <= length; step++) {
          const x = from.x + dx * step, y = from.y + dy * step;
          for (let offset = 0; offset < path.width; offset++) {
            if (dx !== 0) carve(x, y + offsetStart + offset);
            else carve(x + offsetStart + offset, y);
          }
        }
      }
    }
    spawn = authored.spawn;
    stairs = authored.stairs;
  } else {
    for (const slot of layout!.rooms) {
      const center = centers[slot];
      const roomW = int(rng, 5, 7), roomH = int(rng, 5, 7);
      const left = center.x - Math.floor(roomW / 2), top = center.y - Math.floor(roomH / 2);
      for (let y = top; y < top + roomH; y++) {
        for (let x = left; x < left + roomW; x++) carve(x, y);
      }
    }

    const carveSegment = (from: Point, to: Point) => {
      if (from.x !== to.x && from.y !== to.y) throw new Error("Dungeon room links must use orthogonal segments");
      if (from.x === to.x) {
        for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) carve(from.x, y);
      } else {
        for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) carve(x, from.y);
      }
    };
    for (const link of layout!.links) {
      const rawVia = link.via ?? [];
      const route = [centers[link.from], ...rawVia.map(mirrorPoint), centers[link.to]];
      for (let i = 1; i < route.length; i++) carveSegment(route[i - 1], route[i]);
    }
    spawn = centers[layout!.spawn];
    stairs = centers[layout!.stairs];
  }

  const floor: Floor = {
    depth, theme: themeForDepth(depth), roomCount: authored?.roomCount ?? layout!.rooms.length,
    w, h, tiles, seen: new Array<number>(w * h).fill(0), spawn,
    stairs, items: [], dimlings: [], props: [], revealed: false,
  };

  const dist = distances(floor, spawn);
  const cells: Point[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = dist[at(x, y)];
    if (d < 0) continue;
    cells.push({ x, y });
  }

  const taken = new Set<number>([at(spawn.x, spawn.y), at(stairs.x, stairs.y)]);
  let nextId = 1;
  const place = (minDist: number) => {
    for (let tries = 0; tries < 200; tries++) {
      const c = cells[int(rng, 0, cells.length - 1)];
      const k = at(c.x, c.y);
      if (taken.has(k) || dist[k] < minDist) continue;
      taken.add(k);
      return c;
    }
    return null;
  };
  const addItem = (kind: ItemKind, minDist = 3) => {
    const c = place(minDist);
    if (c) floor.items.push({ ...c, id: nextId++, kind });
  };

  // A bigger floor holds proportionally more, so loot per step walked stays about the same.
  const find = 1 + options.findPct / 100;
  const scale = floorScale(depth);
  const count = (base: number) => Math.round(base * scale);
  for (let i = 0; i < count(6 + depth); i++) addItem("gold");
  for (let i = 0; i < count(3 + Math.floor(depth / 2)); i++) addItem("crystal");
  for (let i = 0; i < Math.round(count(Math.max(1, 3 - Math.floor(depth / 3))) * tuning.oilJarCount); i++) addItem("oil");
  addItem("chest", 6);
  if (chance(rng, Math.min(0.9, 0.4 * find))) addItem("chest", 6);
  if (scale > 1 && chance(rng, Math.min(0.9, 0.4 * find))) addItem("chest", 6);
  if (depth >= 3 && chance(rng, Math.min(0.95, 0.35 * find))) addItem("vault", 10);

  // Six creatures on the first floor and more below, but never more than the rooms can hold.
  const dimlings = Math.min(enemyCount(depth), Math.floor(cells.length / 12));
  for (let i = 0; i < dimlings; i++) {
    if (i === 0 && depth === BOSS_DEPTH) {
      // Cerberus replaces the first dimling. It takes a 2x2 patch of open floor close to the stairs it seals.
      const free = (c: Point) => cells.some(o => o.x === c.x && o.y === c.y) && !taken.has(at(c.x, c.y));
      const guard = cells
        .filter(c => footprint({ ...c, size: BOSS_SIZE }).every(free) && dimlingDistance({ ...c, size: BOSS_SIZE }, stairs) >= 2)
        .sort((a, b) => dimlingDistance({ ...a, size: BOSS_SIZE }, stairs) - dimlingDistance({ ...b, size: BOSS_SIZE }, stairs) || a.y - b.y || a.x - b.x)[0];
      if (guard) {
        for (const c of footprint({ ...guard, size: BOSS_SIZE })) taken.add(at(c.x, c.y));
        floor.dimlings.push({ ...guard, id: nextId++, hp: BOSS_HP, maxHp: BOSS_HP, awake: false, boss: true, size: BOSS_SIZE });
        continue;
      }
    }
    // Keep creatures a few tiles apart so they do not arrive as one lump.
    let c: Point | null = null;
    for (let tries = 0; tries < 30 && !c; tries++) {
      const candidate = place(6);
      if (!candidate) break;
      if (floor.dimlings.every(o => manhattan(o, candidate) >= 3)) c = candidate;
      else taken.delete(at(candidate.x, candidate.y));
    }
    if (!c) continue;
    const species = pickEnemy(rng, depth);
    const hp = Math.round((2 + Math.floor(depth / 2)) * HP_SCALE * enemyDef(species).hp);
    floor.dimlings.push({
      ...c, id: nextId++, hp, maxHp: hp, awake: false, species, phase: "idle", windupLeft: 0, cooldown: 0, aim: null,
    });
  }

  // Urns, crates and barrels stand in the rooms. One is never put where it would shut a route: every open tile must
  // still be reachable without breaking anything, and none sits against the rift or the stairs.
  const reachable = (blocked: Set<number>) => {
    const seen = new Set<number>([at(spawn.x, spawn.y)]);
    const queue: Point[] = [spawn];
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head];
      for (const d of DIRS) {
        const nx = p.x + d.x, ny = p.y + d.y;
        if (!isFloor(floor, nx, ny) || seen.has(at(nx, ny)) || blocked.has(at(nx, ny))) continue;
        seen.add(at(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
    return seen.size;
  };
  const propTiles = new Set<number>();
  const counts = propCounts(depth);
  const placeProp = (kind: PropKind) => {
    for (let tries = 0; tries < 60; tries++) {
      const c = place(2);
      if (!c) return;
      const k = at(c.x, c.y);
      const nearExit = manhattan(c, spawn) < 2 || manhattan(c, stairs) < 2;
      const blocked = new Set(propTiles).add(k);
      if (nearExit || hasFloorDecor(c.x, c.y) || reachable(blocked) !== cells.length - blocked.size) { taken.delete(k); continue; }
      propTiles.add(k);
      const hp = propDef(kind).hp;
      floor.props.push({ ...c, id: nextId++, kind, hp, maxHp: hp });
      return;
    }
  };
  for (const def of PROPS) {
    for (let i = 0; i < count(counts[def.id]); i++) placeProp(def.id);
  }
  return floor;
}

/** Bresenham line of sight; walls block, the endpoint itself may be a wall. */
export function hasLineOfSight(floor: Floor, a: Point, b: Point) {
  let x0 = a.x, y0 = a.y;
  const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0);
  const sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
  let err = dx + dy;
  while (!(x0 === b.x && y0 === b.y)) {
    if (!(x0 === a.x && y0 === a.y) && !isFloor(floor, x0, y0)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return true;
}

export function visibleSet(floor: Floor, from: Point, radius: number) {
  const out = new Set<number>();
  for (let y = from.y - radius; y <= from.y + radius; y++) {
    for (let x = from.x - radius; x <= from.x + radius; x++) {
      if (x < 0 || y < 0 || x >= floor.w || y >= floor.h) continue;
      if ((x - from.x) ** 2 + (y - from.y) ** 2 > radius * radius + radius) continue;
      if (hasLineOfSight(floor, from, { x, y })) out.add(idx(floor, x, y));
    }
  }
  return out;
}
