import {
  CAMP_H, CAMP_PROPS, CAMP_W, STATIONS, campHash, terrainAt, type Station, type StationId, type Terrain,
} from "@/game/camp";
import { ANIMALS } from "@/game/animals";
import {
  CAMP_ART_HEIGHT, CAMP_ART_URL, CAMP_ART_WIDTH, CAMP_LABELS, CAMP_LIGHTS, CAMP_OCCLUDERS, CAMP_WATER,
  type CampOccluder, type CampPoint,
} from "@/game/camp-art";
import type { Npc } from "@/game/camp-crowd";
import { drawHero, type HeroPose } from "./mob-art";
import { PALETTE } from "./pixel-art";

export { PALETTE };

export const CAMP_TILE = 32;
const WORLD_W = CAMP_W * CAMP_TILE;
const WORLD_H = CAMP_H * CAMP_TILE;

// ---------------------------------------------------------------- multicolor sprites

export type Sprite = readonly string[];
export const SPRITE_SIZE = 16;
const bottomAlign = (rows: readonly string[]): Sprite => [
  ...Array<string>(Math.max(0, SPRITE_SIZE - rows.length)).fill(".".repeat(SPRITE_SIZE)), ...rows,
];
const boxed = (interior: readonly string[]): string[] => interior.map(row => `.k${row}k.`);

export const SPRITES: Record<StationId | "lamp" | "crystal" | "mushroom" | "crate" | "rock", Sprite> = {
  gate: bottomAlign([
    "...kkkkkkkkkk...",
    "..kggggggggggk..",
    ".kggggggggggggk.",
    ".kgggkkkkkkgggk.",
    ".kggkkVVVVkkggk.",
    ".kggkVllllVkggk.",
    ".kggkVlwwlVkggk.",
    ".kggkVlwwlVkggk.",
    ".kggkVllllVkggk.",
    ".kggkVllllVkggk.",
    ".kggkkVVVVkkggk.",
    ".kggGkkkkkkGggk.",
    ".kgGGGGGGGGGGgk.",
    ".kkkkkkkkkkkkkk.",
  ]),
  altar: bottomAlign([
    ".......kk.......",
    "......kppk......",
    ".....kpwppk.....",
    "....kpwpppPk....",
    ".....kpppPk.....",
    "......kpPk......",
    ".......kk.......",
    "..kkkkkkkkkkkk..",
    ".kggggggggggggk.",
    ".kgGGGGGGGGGGgk.",
    "..kggggggggggk..",
    "...kgGGGGGGgk...",
    "..kggggggggggk..",
    ".kkkkkkkkkkkkkk.",
  ]),
  armory: bottomAlign([
    "......kkkk......",
    "....kkrrrrkk....",
    "...krrrwwrrrk...",
    "..krrrrwwrrrrk..",
    "..krrrrwwrrrrk..",
    "..krwwwwwwwwrk..",
    "..krrrrwwrrrrk..",
    "...krrrwwrrrk...",
    "...kkrrwwrrkk...",
    ".....kkwwkk.....",
    ".......kk.......",
    "..kkkkkkkkkkkk..",
    "..kbbbbbbbbbbk..",
    "..kBBBBBBBBBBk..",
    "..kkkkkkkkkkkk..",
  ]),
  board: bottomAlign([
    ".kkkkkkkkkkkkkk.",
    ".kbbbbbbbbbbbbk.",
    ".kbwwwwbyyyyybk.",
    ".kbwppwbyYYYybk.",
    ".kbwwwwbyyyyybk.",
    ".kbbbbbbbbbbbbk.",
    ".kbrrrrbwwwwwbk.",
    ".kbrRRrbwcccwbk.",
    ".kbrrrrbwwwwwbk.",
    ".kbbbbbbbbbbbbk.",
    ".kkkkkkkkkkkkkk.",
    ".......BB.......",
    ".......BB.......",
    "......kBBk......",
    ".....kkkkkk.....",
  ]),
  ledger: bottomAlign([
    "...kkkkkkkkkk...",
    "..kyyyyyyyyyyk..",
    ".kyyyyyyyyyyyyk.",
    ".kkkkkkkkkkkkkk.",
    ".kYYYYYYYYYYYYk.",
    ".kYYYYkkkkYYYYk.",
    ".kYYYkyyyykYYYk.",
    ".kYYYkykkykYYYk.",
    ".kYYYkyyyykYYYk.",
    ".kYYYYkkkkYYYYk.",
    ".kYYYYYYYYYYYYk.",
    ".kkkkkkkkkkkkkk.",
    "..kk........kk..",
  ]),
  guide: bottomAlign([
    ...boxed([
      "cccccccccccc",
      "ccccwwwwcccc",
      "cccwwccwwccc",
      "cccccccwwccc",
      "ccccccwwcccc",
      "ccccccwwcccc",
      "cccccccccccc",
      "ccccccwwcccc",
      "CCCCCCCCCCCC",
    ]),
    ".kkkkkkkkkkkkkk.",
    ".......BB.......",
    ".......BB.......",
    "......kBBk......",
    ".....kkkkkk.....",
  ]),
  hall: bottomAlign([
    "....y..yy..y....",
    "....yyyyyyyy....",
    "...kggggggggk...",
    "..kggggggggggk..",
    "..kggkkggkkggk..",
    "..kggkkggkkggk..",
    "..kggggggggggk..",
    "...kggkkkkggk...",
    "....kggggggk....",
    "...kkkkkkkkkk...",
    "..kGGGGGGGGGGk..",
    "..kGggggggggGk..",
    "..kGGGGGGGGGGk..",
    ".kkkkkkkkkkkkkk.",
  ]),
  lamp: bottomAlign([
    "......kkkk......",
    ".....koyyok.....",
    ".....kyywyk.....",
    ".....koyyok.....",
    "......kkkk......",
    ".......kB.......",
    ".......BB.......",
    ".......BB.......",
    ".......BB.......",
    ".......BB.......",
    ".......BB.......",
    "......kBBk......",
    ".....kkkkkk.....",
  ]),
  crystal: bottomAlign([
    "........c.......",
    ".......cwc......",
    ".......cwCc.c...",
    "..c...cwwCc.cw..",
    ".cwc..cwCCc.cC..",
    ".cwCc.cwCCc.cC..",
    ".cwCc.cwCCcccC..",
    ".cCCcccwCCCcCC..",
    "..cCCcCCCCCCC...",
    "..kCCCCCCCCCk...",
    "...kkkkkkkkk....",
  ]),
  mushroom: bottomAlign([
    "....kkkkkkkk....",
    "..kkpppwppppkk..",
    ".kpppwwpppppppk.",
    ".kpwwppppppwwpk.",
    ".kppppppPPpppPk.",
    "..kkPPPPPPPPkk..",
    "....kkwwwwkk....",
    ".....kwwwwk.....",
    ".....kwwwwk.....",
    "....kkwwwwkk....",
    "...kkkkkkkkkk...",
  ]),
  crate: bottomAlign([
    "..kkkkkkkkkkkk..",
    "..kbbbbbbbbbbk..",
    "..kbBbbbbbbBbk..",
    "..kbbBbbbbBbbk..",
    "..kbbbBbbBbbbk..",
    "..kbbbbBBbbbbk..",
    "..kbbbBbbBbbbk..",
    "..kbbBbbbbBbbk..",
    "..kbBbbbbbbBbk..",
    "..kbbbbbbbbbbk..",
    "..kkkkkkkkkkkk..",
  ]),
  rock: bottomAlign([
    "......kkkk......",
    "....kkggggkk....",
    "...kgggwggggk...",
    "..kggggggGGggk..",
    ".kggggggggGGggk.",
    ".kGGGGGGGGGGGGk.",
    "..kkkkkkkkkkkk..",
  ]),
};

const spriteCache = new Map<string, HTMLCanvasElement>();

function spriteCanvas(key: keyof typeof SPRITES, px: number) {
  const id = `${key}:${px}`;
  const cached = spriteCache.get(id);
  if (cached) return cached;
  const rows = SPRITES[key];
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE * px;
  canvas.height = SPRITE_SIZE * px;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const color = PALETTE[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * px, r * px, px, px);
    }
  });
  spriteCache.set(id, canvas);
  return canvas;
}

// ---------------------------------------------------------------- terrain

const GROUND: Record<Terrain, string[]> = {
  moss: ["#2f8f86", "#2b8781", "#339a8e"],
  path: ["#cf97ad", "#c98fa6", "#d59fb5"],
  plaza: ["#d9a4b9", "#d29db2", "#dfaec1"],
  water: ["#1f5f8b", "#1b5680", "#236a96"],
  cliff: ["#2d2560", "#332a6b", "#282157"],
};

let worldLayer: HTMLCanvasElement | null = null;

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, kind: Terrain) {
  const px = x * CAMP_TILE, py = y * CAMP_TILE;
  const n = campHash(x, y);
  const palette = GROUND[kind];
  ctx.fillStyle = palette[Math.floor(n * palette.length) % palette.length];
  ctx.fillRect(px, py, CAMP_TILE, CAMP_TILE);

  if (kind === "moss") {
    for (let i = 0; i < 4; i++) {
      const h = campHash(x * 7 + i, y * 13 + i);
      ctx.fillStyle = h < 0.5 ? "#23736f" : "#48b0a0";
      ctx.fillRect(px + Math.floor(h * 26) + 2, py + Math.floor(campHash(y + i, x) * 24) + 4, 3, 2);
    }
    if (n > 0.9) {
      ctx.fillStyle = "#ffd34d"; ctx.fillRect(px + 10, py + 14, 3, 3);
      ctx.fillStyle = "#fff6c4"; ctx.fillRect(px + 11, py + 15, 1, 1);
    } else if (n < 0.06) {
      ctx.fillStyle = "#ff8fd0"; ctx.fillRect(px + 20, py + 9, 3, 3);
    }
    if (terrainAt(x, y - 1) === "cliff") { ctx.fillStyle = "rgba(20,12,50,0.35)"; ctx.fillRect(px, py, CAMP_TILE, 8); }
  } else if (kind === "path" || kind === "plaza") {
    ctx.fillStyle = "#a9718a";
    ctx.fillRect(px, py + CAMP_TILE - 2, CAMP_TILE, 2);
    ctx.fillRect(px + CAMP_TILE - 2, py, 2, CAMP_TILE);
    ctx.fillRect(px + 8 + Math.floor(n * 12), py, 2, 14);
    ctx.fillStyle = "#e9c1d1";
    ctx.fillRect(px, py, CAMP_TILE - 2, 2);
    ctx.fillRect(px, py, 2, CAMP_TILE - 2);
    if (n > 0.7) { ctx.fillStyle = "#b47b93"; ctx.fillRect(px + 14 + Math.floor(n * 6), py + 20, 4, 2); }
  } else if (kind === "water") {
    ctx.fillStyle = "#154870";
    ctx.fillRect(px, py + 12, CAMP_TILE, 2);
    ctx.fillRect(px, py + 26, CAMP_TILE, 2);
    if (terrainAt(x, y - 1) !== "water") { ctx.fillStyle = "#0f3556"; ctx.fillRect(px, py, CAMP_TILE, 4); }
    const shore = terrainAt(x - 1, y) !== "water" || terrainAt(x + 1, y) !== "water" || terrainAt(x, y + 1) !== "water";
    if (shore) { ctx.fillStyle = "#7fd0e8"; ctx.fillRect(px + 4, py + 20, 6, 2); }
  } else {
    ctx.fillStyle = "#3e3480";
    ctx.fillRect(px, py + 15, CAMP_TILE, 2);
    ctx.fillRect(px + (n > 0.5 ? 10 : 20), py, 2, 15);
    ctx.fillRect(px + (n > 0.5 ? 22 : 8), py + 17, 2, 15);
    if (terrainAt(x, y + 1) !== "cliff") {
      ctx.fillStyle = "#6a5cc4"; ctx.fillRect(px, py + CAMP_TILE - 4, CAMP_TILE, 4);
      ctx.fillStyle = "#1b1540"; ctx.fillRect(px, py + CAMP_TILE - 1, CAMP_TILE, 1);
    }
    if (terrainAt(x, y - 1) !== "cliff" && y > 0) { ctx.fillStyle = "#8574e6"; ctx.fillRect(px, py, CAMP_TILE, 2); }
  }
}

/** The ground never changes, so the whole camp is painted once and cropped each frame. */
function worldCanvas() {
  if (worldLayer) return worldLayer;
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < CAMP_H; y++) for (let x = 0; x < CAMP_W; x++) drawTile(ctx, x, y, terrainAt(x, y));
  worldLayer = canvas;
  return canvas;
}

export type View = { w: number; h: number };

/**
 * Top-left of the camera in world pixels, centered on the delver and kept inside the camp.
 * On a screen larger than the camp the camp is simply centered, so the offset can be negative.
 */
export function campCamera(pos: { x: number; y: number }, view: View) {
  const axis = (at: number, size: number, world: number) =>
    world <= size ? Math.round((world - size) / 2) : Math.round(Math.min(Math.max(at * CAMP_TILE + CAMP_TILE / 2 - size / 2, 0), world - size));
  return { x: axis(pos.x, view.w, WORLD_W), y: axis(pos.y, view.h, WORLD_H) };
}

// ---------------------------------------------------------------- text

// Silkscreen is drawn on an 8px grid; at 10px its "C" blurs into an "O" ("WELOOME"), so labels use 8 or 16.
const FONT = (size: number) => `${size}px Silkscreen, monospace`;

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 8) {
  ctx.font = FONT(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#150c2b";
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1]]) ctx.fillText(text, x + dx, y + dy);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function bubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = FONT(9);
  const lines = wrap(ctx, text, 150);
  const width = Math.max(...lines.map(l => ctx.measureText(l).width)) + 12;
  const height = lines.length * 12 + 8;
  const left = Math.round(x - width / 2), top = Math.round(y - height);
  ctx.fillStyle = "#150c2b";
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = "#fbf7ff";
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = "#150c2b";
  ctx.fillRect(Math.round(x) - 3, top + height, 6, 3);
  ctx.fillStyle = "#fbf7ff";
  ctx.fillRect(Math.round(x) - 2, top + height - 1, 4, 3);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2a1a4d";
  lines.forEach((l, i) => ctx.fillText(l, x, top + 10 + i * 12));
}

// ---------------------------------------------------------------- frame

export type CampNpc = { npc: Npc; x: number; y: number; walking: boolean };

export type CampFrame = {
  time: number;
  reducedMotion: boolean;
  camera: { x: number; y: number };
  /** Size of the picture in world pixels. */
  view: View;
  /** Whole screen pixels per world pixel; render directly at this scale to keep the 2x hero texture. */
  zoom: number;
  /** The delver's picture this frame; it is drawn at `playerPos`. */
  hero: HeroPose;
  playerPos: { x: number; y: number };
  playerName: string;
  playerColor: string;
  near: StationId | null;
  /** Whether the player has ever descended. New delvers get a nudge toward the gate. */
  firstVisit: boolean;
  crowd: CampNpc[];
};

const center = (tile: number) => tile * CAMP_TILE + CAMP_TILE / 2;

function drawFire(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, still: boolean) {
  // Drawn at exactly 2x from the bottom middle of its tile, so the pixels stay square.
  ctx.save();
  ctx.translate(x * CAMP_TILE + CAMP_TILE / 2, y * CAMP_TILE + CAMP_TILE);
  ctx.scale(2, 2);
  ctx.translate(-CAMP_TILE / 2, -CAMP_TILE);
  ctx.fillStyle = "#17102b";
  ctx.fillRect(3, 24, 26, 8);
  ctx.fillStyle = "#5e3a1e";
  ctx.fillRect(5, 26, 22, 4);
  ctx.fillStyle = "#8a5a2e";
  ctx.fillRect(8, 23, 16, 4);
  const t = still ? 0 : time;
  // Each tongue is a stack of shrinking rows: orange outside, gold in the middle, pale at the heart.
  const tongues: [number, number, number][] = [[10, 9, 0], [16, 13, 2.1], [22, 8, 4.3]];
  for (const [cx, rows, phase] of tongues) {
    const sway = still ? 0 : Math.round(Math.sin(t / 130 + phase));
    const height = still ? rows : Math.max(4, rows + Math.round(Math.sin(t / 90 + phase) * 2));
    for (let k = 0; k < height; k++) {
      const half = Math.max(1, 3 - Math.floor(k / 4));
      const yy = 24 - k * 2;
      const shift = k > height / 2 ? sway : 0;
      ctx.fillStyle = "#ff5a1a";
      ctx.fillRect(cx - half + shift, yy, half * 2, 2);
      if (k < height * 0.7 && half > 1) {
        ctx.fillStyle = "#ffb800";
        ctx.fillRect(cx - half + 1 + shift, yy, half * 2 - 2, 2);
      }
      if (k < height * 0.35 && half > 2) {
        ctx.fillStyle = "#fff2a0";
        ctx.fillRect(cx - 1 + shift, yy, 2, 2);
      }
    }
  }
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const GLOW: Record<StationId, string> = {
  gate: "204,255,0", altar: "255,95,220", armory: "255,120,90", board: "255,200,90", ledger: "255,194,26",
  guide: "124,247,255", hall: "160,150,255",
};

function drawStation(ctx: CanvasRenderingContext2D, s: Station, near: boolean) {
  const x = s.x * CAMP_TILE + CAMP_TILE / 2 - 24;
  const y = (s.y + 1) * CAMP_TILE - 48;
  ctx.drawImage(spriteCanvas(s.id, 3), x, y);
  if (near) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22;
    ctx.drawImage(spriteCanvas(s.id, 3), x, y);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

const CAMP_SHADOW = "rgba(20,12,50,0.3)";

function drawNpc(ctx: CanvasRenderingContext2D, n: CampNpc, time: number) {
  // The other delvers are animals too, each its own by id; the elder is the old Maine Coon.
  drawHero(ctx, {
    animal: n.npc.kind === "elder" ? "cat-maine-coon" : ANIMALS[n.npc.id % ANIMALS.length],
    dir: n.npc.facing,
    frame: n.walking ? (Math.floor(time / 110) % 2 ? "b" : "c") : "a",
    offX: 0, offY: 0, flash: 0,
  }, n.x * CAMP_TILE, n.y * CAMP_TILE, CAMP_TILE, CAMP_SHADOW);
}

/** Names float above a delver's head, which rises half a tile over the tile it stands on. */
const NAME_ABOVE = 22;

type ArtCut = { object: CampOccluder; canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number };
type PaintedCamp = { image: HTMLImageElement; cuts: ArtCut[]; darkness: HTMLCanvasElement };
let campImage: HTMLImageElement | null = null;
let painted: PaintedCamp | null = null;
let lightFrame: HTMLCanvasElement | null = null;

function polygonPath(polygon: readonly CampPoint[], ox = 0, oy = 0) {
  const path = new Path2D();
  polygon.forEach(([x,y],i) => i ? path.lineTo(x-ox,y-oy) : path.moveTo(x-ox,y-oy));
  path.closePath();
  return path;
}

/** Also used by pointer handling, so a loading/failed painting has the same hit test as its fallback. */
export function paintedCampReady() {
  return campImage !== null && campImage.complete && campImage.naturalWidth === CAMP_ART_WIDTH && campImage.naturalHeight === CAMP_ART_HEIGHT;
}

function paintedCamp(): PaintedCamp | null {
  if (painted) return painted;
  if (!campImage) {
    campImage = new Image();
    campImage.src = `${import.meta.env.BASE_URL}${CAMP_ART_URL}`;
  }
  if (!paintedCampReady()) return null;
  const image = campImage;
  // Clip from the original painting ONCE, into small transparent canvases. No full-map clipping per animation frame.
  const cuts = CAMP_OCCLUDERS.map(object => {
    const xs = object.polygon.map(p => p[0]), ys = object.polygon.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs)-x+1, h = Math.max(...ys)-y+1;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const cut = canvas.getContext("2d")!;
    cut.imageSmoothingEnabled = false;
    cut.clip(polygonPath(object.polygon,x,y),"evenodd");
    cut.drawImage(image,-x,-y);
    return {object,canvas,x,y,w,h};
  });
  const darkness = document.createElement("canvas");
  darkness.width = CAMP_ART_WIDTH; darkness.height = CAMP_ART_HEIGHT;
  const dark = darkness.getContext("2d")!;
  dark.fillStyle = "rgba(5,8,23,0.12)";
  dark.fillRect(0,0,darkness.width,darkness.height);
  const edge = dark.createRadialGradient(768,512,300,768,512,880);
  edge.addColorStop(0,"rgba(3,6,20,0)"); edge.addColorStop(1,"rgba(3,6,20,0.37)");
  dark.fillStyle = edge; dark.fillRect(0,0,darkness.width,darkness.height);
  dark.globalCompositeOperation = "destination-out";
  for (const light of CAMP_LIGHTS) glow(dark,light.x,light.y,light.radius*1.3,"255,255,255",0.8);
  painted = {image,cuts,darkness};
  return painted;
}

/** Feet and physical object bases use exactly the same world-pixel depth unit. */
export function campFootBaseline(tileY: number) { return tileY*CAMP_TILE+CAMP_TILE-2; }

function inView(x: number,y: number,w: number,h: number,f: CampFrame) {
  return x+w >= f.camera.x && y+h >= f.camera.y && x <= f.camera.x+f.view.w && y <= f.camera.y+f.view.h;
}

function paintedWater(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [i,water] of CAMP_WATER.entries()) {
    ctx.save(); ctx.clip(polygonPath(water.polygon));
    const xs = water.polygon.map(p=>p[0]), ys = water.polygon.map(p=>p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs)-x0, h = Math.max(...ys)-y0;
    for (let k = 0; k < 18; k++) {
      const phase = time/1700+k*1.73+i;
      ctx.fillStyle = `rgba(98,213,255,${0.07+0.08*(1+Math.sin(phase))/2})`;
      const x = Math.round(x0+campHash(k,i)*w+Math.sin(phase)*3);
      const y = Math.round(y0+campHash(i,k+3)*h);
      ctx.fillRect(x,y,5+Math.round(campHash(k,11)*10),1);
    }
    ctx.restore();
    // Narrow falling highlights stay within the painted streams, not across adjacent rocks.
    for (const [x,y,w,h] of water.falls) {
      ctx.fillStyle = "rgba(104,225,255,0.13)";
      for (let k = 0; k < 5; k++) {
        const drop = (time/12+k*29)%h;
        ctx.fillRect(Math.round(x+3+(k/5)*(w-6)),Math.round(y+drop),1,Math.max(1,Math.min(7,Math.floor(h-drop))));
      }
    }
  }
  ctx.restore();
}

function paintedFlame(ctx: CanvasRenderingContext2D, x: number,y: number,time: number, fire: boolean,rgb: string) {
  const sway = Math.sin(time/165+x)*2;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const pink = rgb.startsWith("244");
  for (let k = 0; k < (fire ? 5 : 1); k++) {
    const off = fire ? (k-2)*5 : 0;
    const h = (fire ? 10 : 5)+Math.round((1+Math.sin(time/110+k+x))*(fire?4:2));
    ctx.fillStyle = pink ? "rgba(248,87,255,0.22)" : "rgba(255,139,35,0.32)";
    for (let j = 0; j < h; j+=2) ctx.fillRect(Math.round(x+off+sway*j/h)-2,Math.round(y+4-j),j>h/2?2:4,2);
  }
  if (fire) {
    for (let i=0;i<8;i++) {
      const age = (time/1700+i/8)%1;
      ctx.fillStyle = `rgba(255,198,84,${(1-age)*0.55})`;
      ctx.fillRect(Math.round(x+(i-3.5)*4+Math.sin(time/600+i)*5),Math.round(y-age*65),1,2);
    }
  }
  ctx.restore();
}

function paintedLights(ctx: CanvasRenderingContext2D, f: CampFrame) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const [i,light] of CAMP_LIGHTS.entries()) {
    if (!inView(light.x-light.radius,light.y-light.radius,light.radius*2,light.radius*2,f)) continue;
    const slow = light.kind === "crystal" || light.kind === "gate" || light.kind === "tunnel";
    const pulse = f.reducedMotion ? 0 : Math.sin(f.time/(slow?1150:147)+i)*0.03+(slow?0:Math.sin(f.time/53+i)*0.012);
    const alpha = (light.kind === "fire" ? 0.14 : light.kind === "water" ? 0.04 : 0.075)+pulse;
    glow(ctx,light.x,light.y,light.radius*(1+pulse),light.rgb,Math.max(0.025,alpha));
    if (!f.reducedMotion && (light.kind === "fire" || light.kind === "torch")) paintedFlame(ctx,light.x,light.y,f.time,light.kind === "fire",light.rgb);
    if (!f.reducedMotion && light.kind === "tunnel") {
      for (let k=0;k<6;k++) {
        const age = (f.time/3700+k/6)%1;
        ctx.fillStyle = `rgba(120,229,255,${Math.sin(age*Math.PI)*0.25})`;
        ctx.fillRect(Math.round(light.x+Math.sin(k*2.1)*29),Math.round(light.y+22-age*68),1,2);
      }
    }
  }
  ctx.restore();
}

function paintedLightMask(ctx: CanvasRenderingContext2D, art: PaintedCamp, f: CampFrame) {
  if (!lightFrame || lightFrame.width !== f.view.w || lightFrame.height !== f.view.h) {
    lightFrame = document.createElement("canvas");
    lightFrame.width = f.view.w; lightFrame.height = f.view.h;
  }
  const mask = lightFrame.getContext("2d")!;
  mask.globalCompositeOperation = "source-over";
  mask.clearRect(0,0,lightFrame.width,lightFrame.height);
  mask.drawImage(art.darkness,-f.camera.x,-f.camera.y);
  mask.globalCompositeOperation = "destination-out";
  glow(mask,center(f.playerPos.x)-f.camera.x,center(f.playerPos.y)-f.camera.y,105,"255,255,255",0.8);
  ctx.drawImage(lightFrame,0,0);
}

function campNames(ctx: CanvasRenderingContext2D, f: CampFrame) {
  for (const station of STATIONS) {
    const isNear = f.near === station.id;
    // Nearby names stay above the DOOR, so a tall roof cannot move the interaction hint off screen.
    const [x,y] = isNear ? [center(station.x),station.y*CAMP_TILE-47] : CAMP_LABELS[station.id];
    const text = isNear ? `E  ${station.name.toUpperCase()}` : station.name.toUpperCase();
    ctx.font = FONT(8);
    const w = Math.ceil(ctx.measureText(text).width+12);
    ctx.fillStyle = isNear ? "#ccff00" : "rgba(11,15,28,0.72)";
    ctx.fillRect(Math.round(x-w/2),y-8,w,16);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = isNear ? "#150c2b" : "#e7efff";
    ctx.fillText(text,x,y+1);
  }
  if (f.firstVisit && f.near !== "gate") {
    const bob = f.reducedMotion ? 0 : Math.round(Math.sin(f.time/250)*2);
    outlined(ctx,"START HERE",768,248+bob,"#ccff00",8);
  }
  for (const n of f.crowd) {
    const top = n.y*CAMP_TILE-NAME_ABOVE;
    outlined(ctx,n.npc.name,center(n.x),top,n.npc.kind === "elder" ? "#c9bcff" : "#ffffff",8);
    if (n.npc.say) bubble(ctx,n.npc.say,center(n.x),top-10);
  }
  outlined(ctx,f.playerName,center(f.playerPos.x),f.playerPos.y*CAMP_TILE-NAME_ABOVE,f.playerColor,8);
}

/** Painted ground at 1:1, then silhouettes and delvers at their physical depth; old code camp on load failure. */
export function drawCamp(ctx: CanvasRenderingContext2D, f: CampFrame) {
  // ResizeObserver can report a zero-sized viewport while mounting, hiding or removing a scene.
  if (f.view.w < 1 || f.view.h < 1 || f.zoom < 1) return;
  const art = paintedCamp();
  if (!art) { drawCodeCamp(ctx,f); return; }
  ctx.setTransform(f.zoom,0,0,f.zoom,0,0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#070b18"; ctx.fillRect(0,0,f.view.w,f.view.h);
  ctx.save(); ctx.translate(-f.camera.x,-f.camera.y);
  ctx.drawImage(art.image,0,0); // Native 1536 x 1024 pixels: never stretched to a different tile grid.
  if (!f.reducedMotion) paintedWater(ctx,f.time);
  const things: {baseline:number;draw:()=>void}[] = [];
  for (const cut of art.cuts) {
    if (!inView(cut.x,cut.y,cut.w,cut.h,f)) continue;
    things.push({baseline:cut.object.baseline,draw:()=>{
      ctx.drawImage(cut.canvas,cut.x,cut.y);
      if (cut.object.station && f.near === cut.object.station) {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.09;
        ctx.drawImage(cut.canvas,cut.x,cut.y); ctx.restore();
      }
    }});
  }
  for (const n of f.crowd) things.push({baseline:campFootBaseline(n.y)+0.01,draw:()=>drawNpc(ctx,n,f.time)});
  const heroBaseline = campFootBaseline(f.playerPos.y)+0.02;
  const heroX = f.playerPos.x*CAMP_TILE, heroY = f.playerPos.y*CAMP_TILE;
  things.push({baseline:heroBaseline,draw:()=>drawHero(ctx,f.hero,heroX,heroY,CAMP_TILE,CAMP_SHADOW)});
  things.sort((a,b)=>a.baseline-b.baseline).forEach(t=>t.draw());
  // Behind a sign, a lamp post or a stack of crates the delver would vanish: show them through it, faintly. Drawn over
  // the delver's own visible pixels it changes nothing, so it only shows where something in front covers them.
  if (art.cuts.some(c => c.object.baseline > heroBaseline && c.x < heroX+CAMP_TILE+8 && c.x+c.w > heroX-8 && c.y < heroY+CAMP_TILE && c.y+c.h > heroY-24)) {
    ctx.save(); ctx.globalAlpha = 0.45;
    drawHero(ctx,f.hero,heroX,heroY,CAMP_TILE,"rgba(0,0,0,0)");
    ctx.restore();
  }
  paintedLights(ctx,f);
  ctx.restore();
  paintedLightMask(ctx,art,f);
  ctx.save(); ctx.translate(-f.camera.x,-f.camera.y); campNames(ctx,f); ctx.restore();
}

/** Draws the whole camp for one frame. Everything is pixel art built from rectangles. */
function drawCodeCamp(ctx: CanvasRenderingContext2D, f: CampFrame) {
  ctx.setTransform(f.zoom, 0, 0, f.zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const cam = f.camera;
  const { w: viewW, h: viewH } = f.view;
  ctx.fillStyle = "#150c2b";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.drawImage(worldCanvas(), -cam.x, -cam.y);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Water shimmer.
  if (!f.reducedMotion) {
    ctx.fillStyle = "rgba(180,235,255,0.55)";
    const x0 = Math.max(0, Math.floor(cam.x / CAMP_TILE)), x1 = Math.min(CAMP_W - 1, x0 + Math.ceil(viewW / CAMP_TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / CAMP_TILE)), y1 = Math.min(CAMP_H - 1, y0 + Math.ceil(viewH / CAMP_TILE) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (terrainAt(x, y) !== "water") continue;
      const phase = (f.time / 900 + campHash(x, y) * 6) % 1;
      if (phase < 0.5) ctx.fillRect(x * CAMP_TILE + 6 + phase * 16, y * CAMP_TILE + 16, 6, 2);
    }
  }

  type Thing = { y: number; draw: () => void };
  const things: Thing[] = [];
  for (const p of CAMP_PROPS) {
    if (p.kind === "fire") {
      things.push({ y: p.y, draw: () => drawFire(ctx, p.x, p.y, f.time, f.reducedMotion) });
      continue;
    }
    const kind = p.kind;
    const px = kind === "crate" || kind === "rock" ? 2 : 3;
    const off = (SPRITE_SIZE * px - CAMP_TILE) / 2;
    things.push({ y: p.y, draw: () => ctx.drawImage(spriteCanvas(kind, px), p.x * CAMP_TILE - off, (p.y + 1) * CAMP_TILE - SPRITE_SIZE * px) });
  }
  for (const s of STATIONS) things.push({ y: s.y, draw: () => drawStation(ctx, s, f.near === s.id) });
  for (const n of f.crowd) things.push({ y: n.y + 0.01, draw: () => drawNpc(ctx, n, f.time) });
  things.push({
    y: f.playerPos.y + 0.02,
    draw: () => drawHero(ctx, f.hero, f.playerPos.x * CAMP_TILE, f.playerPos.y * CAMP_TILE, CAMP_TILE, CAMP_SHADOW),
  });
  things.sort((a, b) => a.y - b.y).forEach(t => t.draw());

  // Light on top of the scene: the fire, lanterns, crystals and the buildings.
  ctx.globalCompositeOperation = "lighter";
  const flicker = f.reducedMotion ? 0 : Math.sin(f.time / 90) * 6 + Math.sin(f.time / 41) * 3;
  for (const p of CAMP_PROPS) {
    if (p.kind === "fire") glow(ctx, center(p.x), center(p.y) - 8, 190 + flicker, "255,140,50", 0.3);
    else if (p.kind === "lamp") glow(ctx, center(p.x), p.y * CAMP_TILE - 6, 70 + flicker / 3, "255,196,90", 0.28);
    else if (p.kind === "crystal") glow(ctx, center(p.x), center(p.y) - 8, 60, "124,247,255", 0.24);
    else if (p.kind === "mushroom") glow(ctx, center(p.x), center(p.y) - 8, 50, "255,95,220", 0.2);
  }
  for (const s of STATIONS) {
    glow(ctx, center(s.x), s.y * CAMP_TILE, s.id === "gate" ? 120 : 76, GLOW[s.id], f.near === s.id ? 0.34 : s.id === "gate" ? 0.26 : 0.16);
  }
  ctx.globalCompositeOperation = "source-over";

  // Labels and speech sit on top so they always read.
  for (const s of STATIONS) {
    const isNear = f.near === s.id;
    const text = isNear ? `E  ${s.name.toUpperCase()}` : s.name.toUpperCase();
    ctx.font = FONT(8);
    const w = Math.round(ctx.measureText(text).width + 12);
    const cx = center(s.x), cy = s.y * CAMP_TILE - 24;
    ctx.fillStyle = isNear ? "#ccff00" : "rgba(21,12,43,0.82)";
    ctx.fillRect(Math.round(cx - w / 2), cy - 8, w, 16);
    ctx.fillStyle = isNear ? "#150c2b" : "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy + 1);
  }
  if (f.firstVisit && f.near !== "gate") {
    const gate = STATIONS[0];
    const bob = f.reducedMotion ? 0 : Math.round(Math.sin(f.time / 220) * 3);
    outlined(ctx, "START HERE", center(gate.x), gate.y * CAMP_TILE - 48 + bob, "#ccff00", 11);
  }
  for (const n of f.crowd) {
    const top = n.y * CAMP_TILE - NAME_ABOVE;
    outlined(ctx, n.npc.name, center(n.x), top, n.npc.kind === "elder" ? "#c9bcff" : "#ffffff", 9);
    if (n.npc.say) bubble(ctx, n.npc.say, center(n.x), top - 10);
  }
  outlined(ctx, f.playerName, center(f.playerPos.x), f.playerPos.y * CAMP_TILE - NAME_ABOVE, f.playerColor, 8);
  ctx.restore();

  // Soft vignette pulls the eye to the middle of the picture.
  const v = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.5, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.75);
  v.addColorStop(0, "rgba(10,4,30,0)");
  v.addColorStop(1, "rgba(10,4,30,0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, viewW, viewH);
}
