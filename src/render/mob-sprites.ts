/**
 * Pixel art drawn in code (the props: urns, crates, barrels), 16 x 16 by default. A picture is drawn from a few shapes
 * in flat regions; `compile` then adds the outline and the light from the top left. The creatures and the delvers are
 * sprite sheets instead (mob-sheets.ts, animal-sprites.ts).
 */

export const MOB_SIZE = 16;
export type MobPixels = ReadonlyArray<ReadonlyArray<string | null>>;

/**
 * Regions: B body, L light body (belly, snout), D dark body (limbs, ears), S stone or steel, P skin (nose, tongue),
 * W white (claws, teeth, steel tips), A glow (embers, gems), E eyes.
 */
export type Palette = { B: string; L: string; D: string; S: string; P: string; W: string; A: string; E: string };

/** A canvas of regions, one letter per pixel ("." is empty). 16 x 16 for creatures and props, larger for the delver. */
export class Grid {
  readonly cells: string[][];
  readonly w: number;
  readonly h: number;

  constructor(w = MOB_SIZE, h = w) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array<string>(w).fill("."));
  }

  px(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }
  /** A filled ellipse around (cx, cy), measured in pixel centres. */
  ell(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }
}

const OUTLINE = "#0b0912";

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/**
 * Colours the regions, lights the top-left edges, darkens the bottom-right ones and draws the outline. `shaded` lists the
 * regions that get that light and shadow; the others (eyes, glow, white) stay flat.
 */
export function compile(grid: Grid, palette: Readonly<Record<string, string>>, shaded = "BLDSP"): MobPixels {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= grid.w || y >= grid.h ? "." : grid.cells[y][x]);
  const out: (string | null)[][] = [];
  for (let y = 0; y < grid.h; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < grid.w; x++) {
      const region = at(x, y);
      if (region === ".") {
        const touches = at(x - 1, y) !== "." || at(x + 1, y) !== "." || at(x, y - 1) !== "." || at(x, y + 1) !== ".";
        row.push(touches ? OUTLINE : null);
        continue;
      }
      const base = palette[region] ?? "#ff00ff";
      const shadable = shaded.includes(region);
      if (!shadable) { row.push(base); continue; }
      const lit = at(x, y - 1) === "." || at(x - 1, y) === ".";
      const dark = at(x, y + 1) === "." || at(x + 1, y) === ".";
      row.push(lit ? shade(base, 0.22) : dark ? shade(base, -0.3) : base);
    }
    out.push(row);
  }
  return out;
}
