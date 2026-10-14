import type { StationId } from "./camp";

/**
 * The camp as a game map, not a picture (2026-10-15): an empty painted cave (`public/maps/camp-ground.webp`, from
 * art/lobby/raw/ground-v2.webp) with every building, piece of furniture, light and rock drawn on top as its own sprite,
 * standing on its own tiles. All coordinates are tiles of the 48 x 32 camp, or pixels of the 1536 x 1024 ground.
 */
export const CAMP_ART_WIDTH = 1536;
export const CAMP_ART_HEIGHT = 1024;
export const CAMP_ART_URL = "maps/camp-ground.webp";
export type CampPoint = readonly [number, number];

/**
 * The ground: `.` floor, `#` rock, `~` water. Traced from the empty cave by colour, then by hand: dark moss is floor,
 * the tunnel below the entrance and the wall behind the gate are rock.
 */
export const CAMP_GROUND: readonly string[] = [
  "################################################", // 00
  "################################################", // 01
  "################################################", // 02
  "#####################......#####################", // 03
  "#####################......##############~##~~##", // 04
  "#####################......#################~~##", // 05
  "#######.......#####..........####.......####~~##", // 06
  "#######........#####........#####.......####~###", // 07
  "######............##........###.........########", // 08
  "#######..................................#######", // 09
  "#######..................................#######", // 10
  "#######..................................#######", // 11
  "###..........................................###", // 12
  "###..........................................###", // 13
  "###..........................................###", // 14
  "###..........................................###", // 15
  "###..........................................###", // 16
  "###..........................................###", // 17
  "###..........................................###", // 18
  "#####.....................................######", // 19
  "#####.....................................######", // 20
  "###############..........................#######", // 21
  "#################........................#######", // 22
  "###################......................#######", // 23
  "####~###############......................######", // 24
  "###~~~##########################################", // 25
  "####~~##################~#######################", // 26
  "#######~###############~~#######################", // 27
  "#####~~~###############~~~######################", // 28
  "########~##############~~~######################", // 29
  "#######################~~#######################", // 30
  "################################################", // 31
];

/** The three sprite sheets in public/lobby/, in the order scripts/sprite-sheets.mjs cuts them. */
export const CAMP_SHEETS = {
  buildings: ["gate", "hall", "altar", "armory", "ledger", "board", "guide"],
  furniture: ["fire", "bench", "crate", "crates", "barrel", "chair", "tent"],
  decor: ["banner", "lamp", "brazier", "crystal", "mushrooms", "boulder", "stalagmite"],
} as const;
export type CampSheet = keyof typeof CAMP_SHEETS;
export type CampSprite = (typeof CAMP_SHEETS)[CampSheet][number];
/** A cell of every lobby sheet, and where in it a sprite's foot stands (the script's lobby kind). */
export const CAMP_CELL_W = 224, CAMP_CELL_H = 208, CAMP_FOOT_X = 112, CAMP_FOOT_Y = 200;
/** How tall each sprite stands, in pixels (the script's BUILDING_HEIGHT, FURNITURE_HEIGHT, DECOR_HEIGHT). */
export const CAMP_SPRITE_HEIGHT: Record<CampSprite, number> = {
  gate: 186, hall: 150, altar: 150, armory: 156, ledger: 156, board: 128, guide: 74,
  fire: 90, bench: 34, crate: 30, crates: 46, barrel: 34, chair: 38, tent: 104,
  banner: 64, lamp: 72, brazier: 46, crystal: 42, mushrooms: 24, boulder: 38, stalagmite: 60,
};

export const sheetOf = (sprite: CampSprite): CampSheet =>
  (Object.keys(CAMP_SHEETS) as CampSheet[]).find(s => (CAMP_SHEETS[s] as readonly string[]).includes(sprite))!;
export const cellOf = (sprite: CampSprite) => (CAMP_SHEETS[sheetOf(sprite)] as readonly string[]).indexOf(sprite);

/**
 * Something standing in the camp: a sprite on solid tiles (x, y, w, h). It is drawn with its foot at the middle of the
 * footprint's bottom edge, or at `footX` (pixels) when the painted pad is not centred on whole tiles.
 */
export type CampObject = { id: string; sprite: CampSprite; x: number; y: number; w: number; h: number; footX?: number; station?: StationId };

const one = (id: string, sprite: CampSprite, x: number, y: number): CampObject => ({ id, sprite, x, y, w: 1, h: 1 });

export const CAMP_OBJECTS: readonly CampObject[] = [
  // The seven buildings, each on its paved square (see art/lobby/ground-v2-grid.png).
  { id: "gate", sprite: "gate", x: 21, y: 3, w: 6, h: 4, footX: 768, station: "gate" },
  { id: "hall", sprite: "hall", x: 9, y: 7, w: 5, h: 4, footX: 354, station: "hall" },
  { id: "altar", sprite: "altar", x: 4, y: 13, w: 5, h: 5, footX: 192, station: "altar" },
  { id: "armory", sprite: "armory", x: 34, y: 7, w: 6, h: 4, footX: 1181, station: "armory" },
  { id: "ledger", sprite: "ledger", x: 40, y: 13, w: 5, h: 5, footX: 1344, station: "ledger" },
  { id: "board", sprite: "board", x: 34, y: 20, w: 6, h: 4, footX: 1183, station: "board" },
  { id: "guide", sprite: "guide", x: 26, y: 22, w: 2, h: 2, footX: 848, station: "guide" },
  // The plaza: the fire in the middle, benches in its four corners, lamps at the paths' corners.
  { id: "fire", sprite: "fire", x: 23, y: 14, w: 3, h: 2 },
  one("bench-nw", "bench", 21, 13), one("bench-ne", "bench", 27, 13), one("bench-sw", "bench", 21, 17), one("bench-se", "bench", 27, 17),
  one("lamp-w", "lamp", 19, 11), one("lamp-e", "lamp", 29, 11),
  // Banners up to the gate, braziers down to the tunnel.
  one("banner-w", "banner", 22, 9), one("banner-e", "banner", 25, 9),
  one("brazier-w", "brazier", 22, 20), one("brazier-e", "brazier", 25, 20),
  // The tent in the lower left, and the stores around the buildings.
  { id: "tent", sprite: "tent", x: 14, y: 17, w: 4, h: 3 },
  one("hall-barrel", "barrel", 8, 9), one("hall-crate", "crate", 14, 9),
  one("armory-barrel", "barrel", 33, 9), one("armory-crates", "crates", 40, 9),
  one("board-chair", "chair", 33, 22), one("board-crate", "crate", 40, 21),
  // The cave itself: crystals, mushrooms, boulders and stalagmites along the edges.
  one("crystal-nw", "crystal", 6, 8), one("crystal-ne", "crystal", 33, 7), one("crystal-sw", "crystal", 5, 18), one("crystal-se", "crystal", 44, 18),
  one("mushrooms-1", "mushrooms", 16, 12), one("mushrooms-2", "mushrooms", 31, 13), one("mushrooms-3", "mushrooms", 17, 21), one("mushrooms-4", "mushrooms", 30, 22),
  one("boulder-1", "boulder", 27, 6), one("boulder-2", "boulder", 4, 12), one("boulder-3", "boulder", 41, 20),
  one("stalagmite-1", "stalagmite", 20, 6), one("stalagmite-2", "stalagmite", 18, 22), one("stalagmite-3", "stalagmite", 31, 24),
];

/** Where an object's foot stands, in ground pixels: the middle of its footprint's bottom edge, a pixel above the line. */
export const footOf = (o: CampObject) => ({ x: o.footX ?? (o.x + o.w / 2) * 32, y: (o.y + o.h) * 32 - 2 });

/** The box an object's picture covers, in ground pixels (its width as wide as its footprint, at least a tile). */
export function objectBox(o: CampObject) {
  const foot = footOf(o), h = CAMP_SPRITE_HEIGHT[o.sprite];
  const w = Math.max(o.w, 1) * 32;
  return { x: foot.x - w / 2, y: foot.y - h, w, h };
}

/** Labels float above the buildings. */
export const CAMP_LABELS = Object.fromEntries(
  CAMP_OBJECTS.filter(o => o.station).map(o => {
    const box = objectBox(o);
    return [o.station!, [footOf(o).x, Math.max(10, box.y - 6)] as CampPoint];
  }),
) as Record<StationId, CampPoint>;

export type CampLight = { x: number; y: number; rgb: string; radius: number; kind: "fire" | "torch" | "lantern" | "crystal" | "gate" | "water" | "tunnel" };

/** The lights each kind of sprite carries, from its foot. */
const SPRITE_LIGHTS: Partial<Record<CampSprite, (Omit<CampLight, "x" | "y"> & { dx: number; dy: number })[]>> = {
  fire: [{ dx: 0, dy: -24, rgb: "255,143,50", radius: 150, kind: "fire" }],
  lamp: [{ dx: -14, dy: -40, rgb: "255,197,97", radius: 60, kind: "lantern" }],
  brazier: [{ dx: 0, dy: -38, rgb: "255,170,70", radius: 58, kind: "torch" }],
  crystal: [{ dx: 0, dy: -18, rgb: "73,207,255", radius: 54, kind: "crystal" }],
  mushrooms: [{ dx: 0, dy: -10, rgb: "244,100,255", radius: 30, kind: "crystal" }],
  gate: [
    { dx: 0, dy: -70, rgb: "57,241,147", radius: 110, kind: "gate" },
    { dx: -66, dy: -100, rgb: "255,170,70", radius: 56, kind: "torch" }, { dx: 66, dy: -100, rgb: "255,170,70", radius: 56, kind: "torch" },
  ],
  altar: [{ dx: 0, dy: -86, rgb: "244,87,255", radius: 92, kind: "crystal" }],
  hall: [{ dx: 0, dy: -56, rgb: "176,110,255", radius: 74, kind: "crystal" }],
  armory: [{ dx: 18, dy: -40, rgb: "255,140,50", radius: 66, kind: "torch" }],
  ledger: [{ dx: -62, dy: -70, rgb: "255,197,97", radius: 50, kind: "lantern" }, { dx: 62, dy: -70, rgb: "255,197,97", radius: 50, kind: "lantern" }],
  board: [{ dx: -76, dy: -66, rgb: "255,197,97", radius: 50, kind: "lantern" }, { dx: 72, dy: -66, rgb: "255,197,97", radius: 50, kind: "lantern" }],
  guide: [{ dx: -6, dy: -46, rgb: "78,223,255", radius: 40, kind: "crystal" }],
};

export const CAMP_LIGHTS: readonly CampLight[] = [
  ...CAMP_OBJECTS.flatMap(o => (SPRITE_LIGHTS[o.sprite] ?? []).map(({ dx, dy, ...light }) => ({ ...light, x: footOf(o).x + dx, y: footOf(o).y + dy }))),
  { x: 180, y: 860, rgb: "64,195,255", radius: 95, kind: "water" },
  { x: 1430, y: 220, rgb: "64,195,255", radius: 70, kind: "water" },
  { x: 772, y: 900, rgb: "110,225,255", radius: 100, kind: "tunnel" },
];

/** The pools and streams of the empty cave, for their shimmer, and the falls in them (x, y, w, h). */
export const CAMP_WATER: readonly { polygon: readonly CampPoint[]; falls: readonly [number, number, number, number][] }[] = [
  { polygon: [[60, 800], [200, 790], [330, 818], [470, 848], [482, 930], [380, 962], [200, 962], [62, 930]], falls: [[116, 712, 26, 112], [150, 720, 14, 100]] },
  { polygon: [[1380, 236], [1470, 222], [1530, 262], [1520, 320], [1470, 334], [1400, 296]], falls: [[1418, 128, 28, 104]] },
];

/** Point-in-polygon, for the water. */
export function inCampPolygon(x: number, y: number, polygon: readonly CampPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The building under a tap at ground pixel (x, y): the frontmost one whose picture covers it. */
export function paintedStationAt(x: number, y: number): StationId | null {
  const hits = CAMP_OBJECTS.filter(o => {
    if (!o.station) return false;
    const b = objectBox(o);
    return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  });
  hits.sort((a, b) => footOf(b).y - footOf(a).y);
  return hits[0]?.station ?? null;
}
