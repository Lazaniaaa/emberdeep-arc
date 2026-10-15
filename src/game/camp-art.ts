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
 * the tunnel below the entrance and the wall behind the gate are rock; rows 6-8 between the buildings are floor (2026-10-15).
 */
export const CAMP_GROUND: readonly string[] = [
  "################################################", // 00
  "################################################", // 01
  "################################################", // 02
  "#####################......#####################", // 03
  "#####################......##############~##~~##", // 04
  "#####################......#################~~##", // 05
  "#######.................................####~~##", // 06
  "#######.................................####~###", // 07
  "######..................................########", // 08
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

/** Sprite rows in public/lobby/, in the order scripts/sprite-sheets.mjs cuts them. */
export const CAMP_SHEETS = {
  buildings: ["gate", "hall", "altar", "armory", "ledger", "board", "guide"],
  furniture: ["fire", "bench", "crate", "crates", "barrel", "chair", "tent"],
  benches: ["bench-h", "bench-v"],
  vault: ["vault-west"],
  decor: ["banner", "lamp", "brazier", "crystal", "mushrooms", "boulder", "stalagmite"],
  curbs: ["curb-h", "curb-v", "curb-outer", "curb-inner", "curb-end-h", "curb-end-v"],
} as const;
export type CampSheet = keyof typeof CAMP_SHEETS;
export type CampSprite = (typeof CAMP_SHEETS)[CampSheet][number];
/** A cell of every lobby sheet, and where in it a sprite's foot stands (the script's lobby kind). */
export const CAMP_CELL_W = 224, CAMP_CELL_H = 208, CAMP_FOOT_X = 112, CAMP_FOOT_Y = 200;
/** Owner's square-hearth experiment. "round" restores the original sprite and foot position. */
export const CAMP_FIRE_STYLE: "square" | "round" = "square";
/** How tall each sprite stands, in pixels (the script's BUILDING_HEIGHT, FURNITURE_HEIGHT, DECOR_HEIGHT). */
export const CAMP_SPRITE_HEIGHT: Record<CampSprite, number> = {
  gate: 168, hall: 151, altar: 136, armory: 151, ledger: 147, board: 129, guide: 84,
  fire: 90, bench: 34, crate: 30, crates: 46, barrel: 34, chair: 38, tent: 104,
  "bench-h": 26, "bench-v": 72, "vault-west": 144,
  banner: 64, lamp: 72, brazier: 46, crystal: 42, mushrooms: 24, boulder: 38, stalagmite: 60,
  "curb-h": 8, "curb-v": 32, "curb-outer": 32, "curb-inner": 32, "curb-end-h": 8, "curb-end-v": 32,
};

export const sheetOf = (sprite: CampSprite): CampSheet =>
  (Object.keys(CAMP_SHEETS) as CampSheet[]).find(s => (CAMP_SHEETS[s] as readonly string[]).includes(sprite))!;
export const cellOf = (sprite: CampSprite) => (CAMP_SHEETS[sheetOf(sprite)] as readonly string[]).indexOf(sprite);

/**
 * Something standing in the camp: a sprite on solid tiles (x, y, w, h). It is drawn with its foot at the middle of the
 * footprint's bottom edge, or at `footX`, `footY` (pixels). Building foundations align to their grid pads, with the
 * eight-pixel curb outside the paving; overrides calibrate the artwork's actual bottom/centre.
 */
export type CampObject = { id: string; sprite: CampSprite; x: number; y: number; w: number; h: number; footX?: number; footY?: number; station?: StationId };

const one = (id: string, sprite: CampSprite, x: number, y: number): CampObject => ({ id, sprite, x, y, w: 1, h: 1 });

export const CAMP_OBJECTS: readonly CampObject[] = [
  // Buildings fit inside their grid pads. The Vault's rectangular base has its entrance on the west (plaza) side.
  { id: "gate", sprite: "gate", x: 21, y: 3, w: 6, h: 4, footX: 768, footY: 212, station: "gate" },
  { id: "hall", sprite: "hall", x: 9, y: 7, w: 5, h: 4, footX: 354, footY: 340, station: "hall" },
  { id: "altar", sprite: "altar", x: 4, y: 13, w: 5, h: 4, footX: 208, footY: 534, station: "altar" },
  { id: "armory", sprite: "armory", x: 34, y: 7, w: 6, h: 4, footX: 1180, footY: 340, station: "armory" },
  { id: "ledger", sprite: "vault-west", x: 40, y: 12, w: 5, h: 4, footX: 1360, footY: 502, station: "ledger" },
  { id: "board", sprite: "board", x: 34, y: 20, w: 6, h: 4, footX: 1182, footY: 756, station: "board" },
  { id: "guide", sprite: "guide", x: 26, y: 22, w: 2, h: 2, footX: 852, footY: 768, station: "guide" },
  // Only the two horizontal benches remain by the hearth; the corner approaches stay open.
  { id: "fire", sprite: "fire", x: 23, y: 14, w: 3, h: CAMP_FIRE_STYLE === "square" ? 3 : 2, footY: CAMP_FIRE_STYLE === "square" ? 532 : 510 },
  { id: "bench-n", sprite: "bench-h", x: 23, y: 13, w: 3, h: 1 },
  { id: "bench-s", sprite: "bench-h", x: 23, y: 17, w: 3, h: 1 },
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
export const footOf = (o: CampObject) => ({ x: o.footX ?? (o.x + o.w / 2) * 32, y: o.footY ?? (o.y + o.h) * 32 - 2 });

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

/** A square plaza centred on the fire's ground position, in whole tiles. */
export const CAMP_PLAZA_PAVING = { id: "plaza", x: 20, y: 11, w: 9, h: 9 } as const;

/** These tile rectangles define paths, the square plaza and seven building pads.
 * Their outside contour is a solid curb; shared edges between paved areas remain open.
 */
export const CAMP_PAVING = [
  { id: "gate-pad", x: 21, y: 3, w: 6, h: 4 },
  { id: "hall-pad", x: 8, y: 7, w: 6, h: 4 },
  { id: "armory-pad", x: 34, y: 7, w: 6, h: 4 },
  { id: "altar-pad", x: 4, y: 13, w: 5, h: 5 },
  { id: "vault-pad", x: 40, y: 12, w: 5, h: 5 },
  { id: "board-pad", x: 34, y: 20, w: 6, h: 4 },
  { id: "guide-pad", x: 23, y: 22, w: 5, h: 3 },
  { id: "north-path", x: 23, y: 7, w: 2, h: 5 },
  { id: "south-path", x: 23, y: 18, w: 2, h: 7 },
  { id: "cross-path", x: 9, y: 14, w: 31, h: 2 },
  { id: "hall-path", x: 10, y: 11, w: 2, h: 3 },
  { id: "armory-path", x: 36, y: 11, w: 2, h: 3 },
  { id: "board-path", x: 36, y: 16, w: 2, h: 4 },
  CAMP_PLAZA_PAVING,
] as const;

/** Reuse approved pixels, as the dungeon floor patches do. No generated or code-painted replacement art.
 * The old painting's paving was not on 32px boundaries. Repair those regions with its moss, then lay its stone
 * tile on CAMP_PAVING, so a single table controls the actual paving AND its curb. Source painting stays untouched.
 */
export const CAMP_FLOOR_SAMPLES = {
  stone: { x: 461, y: 467, w: 25, h: 25 },
  moss: { x: 508, y: 362, w: 64, h: 64 },
} as const;
export const CAMP_PAVING_REPAIRS = [
  { x: 682, y: 84, w: 172, h: 130 },
  { x: 270, y: 214, w: 166, h: 130 }, { x: 1096, y: 214, w: 170, h: 130 },
  { x: 114, y: 410, w: 156, h: 158 }, { x: 1266, y: 410, w: 156, h: 158 },
  { x: 1096, y: 628, w: 170, h: 144 }, { x: 735, y: 718, w: 170, h: 80 },
  { x: 735, y: 212, w: 66, h: 588 },
  { x: 269, y: 465, w: 999, h: 52 },
  { x: 326, y: 344, w: 54, h: 121 }, { x: 1156, y: 344, w: 54, h: 284 },
  { x: 631, y: 374, w: 274, h: 230, ellipse: true },
] as const;

export type CampEdge = { a: CampPoint; b: CampPoint };
/** Exact missing edges at the tunnel. Building doors join paved areas internally and need no outside-edge gaps. */
export const CAMP_CURB_OPENINGS: readonly CampEdge[] = [
  { a: [23,25], b: [24,25] }, { a: [24,25], b: [25,25] },
];
const pavedAt = (x: number, y: number) => CAMP_PAVING.some(p => x >= p.x && x < p.x+p.w && y >= p.y && y < p.y+p.h);
export type CampCurb = CampEdge & { side: "n" | "e" | "s" | "w" };
export const CAMP_CURB_THICKNESS = 8;
/** The stone is OUTSIDE the paving. Its inside face and the blocked step share the tile boundary. */
export function campCurbBox(edge: CampCurb) {
  const horizontal = edge.a[1] === edge.b[1], t = CAMP_CURB_THICKNESS;
  return {
    x: edge.a[0]*32 - (edge.side === "w" ? t : 0),
    y: edge.a[1]*32 - (edge.side === "n" ? t : 0),
    w: horizontal ? 32 : t, h: horizontal ? t : 32,
  };
}
const curbKey = ([x,y]: CampPoint) => `${x},${y}`;
const curbEdgeKey = ({a,b}: CampEdge) => [curbKey(a),curbKey(b)].sort().join("/");

/** Only the outside of the UNION is bordered: shared path/plaza/pad edges always stay open. */
export const CAMP_CURBS: readonly CampCurb[] = (() => {
  const edges: CampCurb[] = [];
  for (let y=0;y<CAMP_ART_HEIGHT/32;y++) for (let x=0;x<CAMP_ART_WIDTH/32;x++) {
    if (!pavedAt(x,y)) continue;
    const candidates: [number,number,CampCurb][] = [
      [0,-1,{a:[x,y],b:[x+1,y],side:"n"}], [1,0,{a:[x+1,y],b:[x+1,y+1],side:"e"}],
      [0,1,{a:[x,y+1],b:[x+1,y+1],side:"s"}], [-1,0,{a:[x,y],b:[x,y+1],side:"w"}],
    ];
    for (const [dx,dy,edge] of candidates) {
      if (pavedAt(x+dx,y+dy)) continue;
      if (CAMP_CURB_OPENINGS.some(gap => curbEdgeKey(gap) === curbEdgeKey(edge))) continue;
      edges.push(edge);
    }
  }
  return edges;
})();

const solidCurbEdges = new Set(CAMP_CURBS.map(curbEdgeKey));
/** The shared tile boundary crossed by an orthogonal step. Used by walking, routing and reachability. */
export function campCurbBlocks(x: number, y: number, nx: number, ny: number) {
  if (Math.abs(nx-x)+Math.abs(ny-y) !== 1) return false;
  const edge = x === nx
    ? { a: [x,Math.max(y,ny)] as CampPoint, b: [x+1,Math.max(y,ny)] as CampPoint }
    : { a: [Math.max(x,nx),y] as CampPoint, b: [Math.max(x,nx),y+1] as CampPoint };
  return solidCurbEdges.has(curbEdgeKey(edge));
}

/** Corners and capped ends share the same contour, so gaps never receive a corner spanning their entrance. */
export const CAMP_CURB_VERTICES = (() => {
  const vertices = new Map<string,{ point: CampPoint; edges: CampCurb[] }>();
  for (const e of CAMP_CURBS) for (const point of [e.a,e.b]) {
    const key = curbKey(point), v = vertices.get(key) ?? { point, edges: [] };
    v.edges.push(e); vertices.set(key,v);
  }
  return [...vertices.values()].map(v => {
    const [x,y] = v.point, quadrants = [pavedAt(x-1,y-1),pavedAt(x,y-1),pavedAt(x,y),pavedAt(x-1,y)];
    const filled = quadrants.filter(Boolean).length;
    const inner = filled === 3;
    const q = quadrants.findIndex(p => inner ? !p : p);
    // NW/NE/SE/SW labels describe where the L's knee lies in its sprite cell.
    const corner = (["se","sw","nw","ne"] as const)[q];
    return { ...v, inner, corner, bend: v.edges.length===2 && (filled===1 || filled===3) };
  });
})();

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
  "vault-west": [{ dx: -12, dy: -86, rgb: "255,197,97", radius: 50, kind: "lantern" }, { dx: 22, dy: -56, rgb: "255,197,97", radius: 50, kind: "lantern" }],
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
