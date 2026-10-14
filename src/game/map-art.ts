import type { Point } from "./dungeon";

/**
 * Some illustrated room links are drawn with masonry (a door post, a torch column) where the traced walkable route
 * passes. Each patch copies the pixels of the `sample` tile over the tiles of the rectangle, so the route reads as an
 * open doorway. Coordinates are tiles of the floor's own grid: 34x22 for floors 1-3, 27x17 for the rest.
 */
export type DoorwayPatch = { x: number; y: number; w: number; h: number; sample: Point };

export const ART_DOORWAYS: Record<number, DoorwayPatch[]> = {
  // Floors 1-3 are drawn on the finer grid; the door posts stay as painted, because a one-tile patch would show as a square.
  1: [],
  2: [],
  3: [],
  4: [
    { x: 7, y: 7, w: 4, h: 2, sample: { x: 13, y: 8 } },
    { x: 16, y: 7, w: 4, h: 2, sample: { x: 13, y: 8 } },
  ],
  5: [
    { x: 9, y: 7, w: 3, h: 2, sample: { x: 13, y: 9 } },
    { x: 16, y: 7, w: 3, h: 2, sample: { x: 13, y: 9 } },
  ],
  6: [
    { x: 7, y: 7, w: 4, h: 2, sample: { x: 12, y: 10 } },
    { x: 17, y: 7, w: 3, h: 2, sample: { x: 15, y: 10 } },
  ],
};

/**
 * Painted details the delver would walk straight through, covered with floor copied from a clear spot: a rectangle in the
 * painting's own pixels and where to copy it from. Floors are drawn on a 32 px grid, so a copy one tile away keeps the
 * pattern of the slabs.
 */
export type ArtPatch = { x: number; y: number; w: number; h: number; from: Point };

export const ART_PATCHES: Record<number, ArtPatch[]> = {
  // Floor 1: the thin stone door frames across both ends of the corridor (owner, 2026-10-14: "better remove the arch").
  1: [
    { x: 336, y: 303, w: 27, h: 73, from: { x: 368, y: 303 } },
    { x: 654, y: 303, w: 25, h: 73, from: { x: 622, y: 303 } },
  ],
};
