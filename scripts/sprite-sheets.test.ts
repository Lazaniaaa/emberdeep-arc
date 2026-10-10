// The game sheets as scripts/sprite-sheets.mjs writes them: one per animal in public/heroes, one per creature in public/mobs.
import { existsSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ANIMALS } from "../src/game/animals";
import { ENEMIES } from "../src/game/enemies";
import { CELL_H, CELL_W, FOOT_Y, TEXTURE_SCALE } from "../src/render/animal-sprites";
import { MOB_CELL_H, MOB_CELL_W, MOB_FOOT_Y, MOB_HEIGHT } from "../src/render/mob-sheets";
import { LOOT_ORDER, PROP_CELL_H, PROP_CELL_W, PROP_FOOT_Y } from "../src/render/prop-sheets";
import { PROPS } from "../src/game/props";
// @ts-expect-error -- a plain .mjs build script without type declarations
import { LOOT_HEIGHT, LOOT_ORDER as SCRIPT_LOOT_ORDER, PROP_HEIGHT } from "./sprite-sheets.mjs";

async function frames(file: string, cols: number, rows: number, cellW: number, cellH: number) {
  expect(existsSync(file), file).toBe(true);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([cellW * cols, cellH * rows]);
  const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
  const out: { top: number; bottom: number; corner: number }[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    let top = -1, bottom = -1;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) if (alpha(col * cellW + x, row * cellH + y)) { if (top < 0) top = y; bottom = y; }
    out.push({ top, bottom, corner: alpha(col * cellW, row * cellH) });
  }
  return out;
}

describe("hero sheets", () => {
  for (const animal of ANIMALS) {
    it(`${animal}: 5 x 4 frames on a clear background, every frame standing on the same line`, async () => {
      for (const f of await frames(`public/heroes/${animal}.png`, 5, 4, CELL_W * TEXTURE_SCALE, CELL_H * TEXTURE_SCALE)) {
        expect(f.corner).toBe(0);
        expect(Math.abs(Math.floor(f.bottom / TEXTURE_SCALE) - FOOT_Y)).toBeLessThanOrEqual(1);
      }
    });
  }
});

describe("source eye details", () => {
  const heroes = [
    { name: "cat-ginger-tabby", band: [50, 66], minIrisWidth: 9, minPupilWidth: 4, iris: (r: number, g: number, b: number) => g > r + 30 && g > b + 15 },
    { name: "cat-scottish-fold", band: [40, 62], iris: (r: number, g: number, b: number) => r > 170 && g > 80 && b < 90 && r - b > 110 },
    { name: "dog-husky", band: [48, 66], minIrisWidth: 7, minPupilWidth: 3, iris: (r: number, g: number, b: number) => b > r + 50 && b > g + 15 && b > 120 },
  ];
  for (const { name, band, iris, minIrisWidth = 4, minPupilWidth = 1 } of heroes) {
    it(`${name}: both eyes retain their coloured iris, pupil and highlight in idle and walk frames`, async () => {
      const { data, info } = await sharp(`public/heroes/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const pixel = (col: number, x: number, y: number) => {
        const i = (y * info.width + col * CELL_W * TEXTURE_SCALE + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      };
      for (let col = 0; col < 3; col++) for (const [left, right] of [[34, 55], [57, 83]]) {
        const points: [number, number][] = [];
        for (let y = band[0]; y <= band[1]; y++) for (let x = left; x <= right; x++) {
          const [r, g, b] = pixel(col, x, y);
          if (iris(r, g, b)) points.push([x, y]);
        }
        expect(points.length, `frame ${col}, eye ${left}: coloured iris`).toBeGreaterThanOrEqual(10);
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        expect(x1 - x0 + 1).toBeGreaterThanOrEqual(minIrisWidth);
        expect(y1 - y0 + 1).toBeGreaterThanOrEqual(5);
        let pupil = 0, highlight = 0;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const rgb = pixel(col, x, y);
          if (rgb.reduce((a, b) => a + b) < 120) pupil++;
          if (Math.min(...rgb) > 200) highlight++;
        }
        expect(pupil, `frame ${col}, eye ${left}: pupil`).toBeGreaterThan(0);
        expect(highlight, `frame ${col}, eye ${left}: highlight`).toBeGreaterThan(0);
        // Look inside the iris, excluding its outline: a round pupil must not collapse into a vertical slit.
        let widestPupil = 0;
        for (let y = y0 + 2; y <= y1 - 2; y++) {
          let width = 0;
          for (let x = x0 + 1; x < x1; x++) {
            width = pixel(col, x, y).reduce((a, b) => a + b) < 120 ? width + 1 : 0;
            widestPupil = Math.max(widestPupil, width);
          }
        }
        expect(widestPupil, `frame ${col}, eye ${left}: rounded pupil width`).toBeGreaterThanOrEqual(minPupilWidth);
      }
    });
  }
});

describe("creature strips", () => {
  for (const e of ENEMIES) {
    it(`${e.id}: 4 frames, standing on the line, as tall as the game expects`, async () => {
      const [first, ...rest] = await frames(`public/mobs/${e.id}.png`, 4, 1, MOB_CELL_W, MOB_CELL_H);
      expect(first.corner).toBe(0);
      expect(Math.abs(first.bottom - MOB_FOOT_Y)).toBeLessThanOrEqual(1);
      // Sparks, spores or a flame tip may stand a little above the body the size is set from.
      expect(Math.abs(first.bottom - first.top + 1 - MOB_HEIGHT[e.id])).toBeLessThanOrEqual(6);
      for (const f of rest) expect(f.top).toBeGreaterThanOrEqual(0);
    });
  }
});

// The props and the loot have no art until the owner generates it (docs/art/PROMPTS.md, П1-П3); the game draws the code
// sprites meanwhile. Whatever sheets exist must fit the cells the game crops.
describe("prop and loot sheets", () => {
  it("cover every prop and the same loot row as the game, in the script's sizes", () => {
    expect(Object.keys(PROP_HEIGHT).sort()).toEqual(PROPS.map(p => p.id).sort());
    expect(SCRIPT_LOOT_ORDER).toEqual(LOOT_ORDER);
    expect(Object.keys(LOOT_HEIGHT).sort()).toEqual([...LOOT_ORDER].sort());
  });

  for (const name of [...PROPS.map(p => p.id), "loot"]) {
    const file = `public/props/${name}.png`;
    it.skipIf(!existsSync(file))(`${name}: frames on a clear background, standing on the line`, async () => {
      const cols = name === "loot" ? LOOT_ORDER.length : 3;
      for (const f of await frames(file, cols, 1, PROP_CELL_W, PROP_CELL_H)) {
        expect(f.corner).toBe(0);
        expect(Math.abs(f.bottom - PROP_FOOT_Y)).toBeLessThanOrEqual(1);
      }
    });
  }
});
