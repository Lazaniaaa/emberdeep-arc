import type { PropKind } from "@/game/props";
import { CELL_H, CELL_W, FOOT_X, FOOT_Y, TEXTURE_SCALE, animalSheet, frameAt, type Animal, type HeroDir, type HeroFrame } from "./animal-sprites";
import type { MobPixels } from "./mob-sprites";
import { propPixels, type PropFrame } from "./prop-sprites";

const canvases = new Map<string, HTMLCanvasElement>();

/**
 * Draws sprite pixels onto a canvas, one canvas pixel per sprite pixel. `flip` mirrors it; `silhouette` paints every
 * pixel one colour, for the flash of a blow landing.
 */
function pixelsToCanvas(pixels: MobPixels, flip: boolean, silhouette?: string) {
  const h = pixels.length, w = pixels[0]?.length ?? 0;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = pixels[y][x];
      if (!color) continue;
      ctx.fillStyle = silhouette ?? color;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return canvas;
}

function cached(key: string, make: () => HTMLCanvasElement) {
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = make();
    canvases.set(key, canvas);
  }
  return canvas;
}

/** A prop (urn, crate, barrel) as a 16 x 16 canvas, whole or cracked. */
export function propCanvas(kind: PropKind, frame: PropFrame): HTMLCanvasElement {
  return cached(`prop:${kind}:${frame}`, () => pixelsToCanvas(propPixels(kind, frame), false));
}

/** One delver this frame: which animal, which way, which frame, the lunge in canvas pixels, and the red of a hit (0-1). */
export type HeroPose = { animal: Animal; dir: HeroDir; frame: HeroFrame; offX: number; offY: number; flash: number };

/**
 * Draws a delver standing on the `tile`-sized tile whose top left is (x, y): a shadow on the floor, then its frame one
 * logical cell size, the feet just above the tile's bottom edge, so the head rises into the tile above. The 2x texture
 * retains the source artwork's eye details when the scene is rendered directly at screen zoom.
 * Nothing but the shadow shows while the sheet is still loading.
 */
export function drawHero(ctx: CanvasRenderingContext2D, pose: HeroPose, x: number, y: number, tile: number, shadow: string) {
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(Math.round(x) + tile / 2, Math.round(y) + tile - 3, tile * 0.32, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const sheet = animalSheet(pose.animal);
  if (!sheet) return;
  const { sx, sy } = frameAt(pose.dir, pose.frame);
  const left = Math.round(x + tile / 2 - FOOT_X + pose.offX), top = Math.round(y + tile - 2 - FOOT_Y + pose.offY);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const crop = [sx * TEXTURE_SCALE, sy * TEXTURE_SCALE, CELL_W * TEXTURE_SCALE, CELL_H * TEXTURE_SCALE] as const;
  ctx.drawImage(sheet.image, ...crop, left, top, CELL_W, CELL_H);
  if (pose.flash > 0) {
    ctx.globalAlpha = Math.min(1, pose.flash);
    ctx.drawImage(sheet.tint("#ff3a2a"), ...crop, left, top, CELL_W, CELL_H);
  }
  ctx.restore();
}
