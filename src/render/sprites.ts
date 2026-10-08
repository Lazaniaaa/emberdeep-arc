export type Mask = readonly string[];

export const ICONS: Record<"gold" | "crystal" | "oil" | "chest" | "vault" | "stairs" | "rift", Mask> = {
  gold: [
    "........",
    "...##...",
    "..#..#..",
    ".##..##.",
    ".######.",
    "#.####.#",
    "########",
    "........",
  ],
  crystal: [
    "...##...",
    "..####..",
    ".##.###.",
    ".######.",
    ".###.##.",
    "..####..",
    "...##...",
    "........",
  ],
  oil: [
    "...##...",
    "...##...",
    "..####..",
    ".#....#.",
    ".######.",
    ".######.",
    "..####..",
    "........",
  ],
  chest: [
    "........",
    ".######.",
    "#......#",
    "########",
    "#..##..#",
    "#......#",
    "########",
    "........",
  ],
  vault: [
    "..####..",
    ".#....#.",
    ".#....#.",
    "########",
    "#.#..#.#",
    "#..##..#",
    "#.#..#.#",
    "########",
  ],
  stairs: [
    "......##",
    "......##",
    "....####",
    "....####",
    "..######",
    "..######",
    "########",
    "########",
  ],
  rift: [
    "..####..",
    ".#....#.",
    "#..##..#",
    "#.#..#.#",
    "#.#..#.#",
    "#..##..#",
    ".#....#.",
    "..####..",
  ],
};

export function drawMask(
  ctx: CanvasRenderingContext2D, mask: Mask, x: number, y: number, px: number, color: string,
  flip = false, halo?: string,
) {
  const w = mask[0].length;
  if (halo) {
    ctx.fillStyle = halo;
    for (let r = 0; r < mask.length; r++) for (let c = 0; c < w; c++) {
      if (mask[r][c] !== "#") continue;
      const cx = flip ? w - 1 - c : c;
      ctx.fillRect(x + (cx - 1) * px, y + r * px, px * 3, px);
      ctx.fillRect(x + cx * px, y + (r - 1) * px, px, px * 3);
    }
  }
  ctx.fillStyle = color;
  for (let r = 0; r < mask.length; r++) for (let c = 0; c < w; c++) {
    if (mask[r][c] !== "#") continue;
    const cx = flip ? w - 1 - c : c;
    ctx.fillRect(x + cx * px, y + r * px, px, px);
  }
}
