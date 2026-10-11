import type { PropKind } from "@/game/props";
import { Grid, compile, type MobPixels, type Palette } from "./mob-sprites";

/**
 * The things to smash, as 16 x 16 pixel art in the same style as the creatures: drawn from a few shapes, outlined and
 * lit from the top left by `compile`. "a" is whole, "b" is cracked and is shown once the prop has taken a blow.
 */
export type PropFrame = "a" | "b";

type Def = { palette: Palette; draw: (f: PropFrame) => Grid };

const DEFS: Record<PropKind, Def> = {
  urn: {
    palette: { B: "#b56a3c", L: "#dd9860", D: "#7a4126", S: "#8a7a6a", P: "#e0b070", W: "#f1e3c0", A: "#e8c070", E: "#ffd23f" },
    draw: f => {
      const g = new Grid();
      g.ell(8, 9.6, 4.8, 4.2, "B").rect(6, 3, 4, 3, "B").rect(5, 2, 6, 2, "L").rect(6, 13, 4, 1, "D");
      g.rect(4, 8, 8, 1, "P").px(6, 6, "L").px(5, 9, "L").px(4, 10, "L");
      g.rect(6, 2, 4, 1, "D");
      if (f === "b") {
        g.line(9, 4, 8, 8, "D").line(8, 8, 10, 11, "D").line(10, 11, 9, 13, "D").px(11, 3, ".").px(12, 4, ".").px(3, 10, ".");
      }
      return g;
    },
  },
  crate: {
    palette: { B: "#94623a", L: "#c08c58", D: "#5e3d20", S: "#a4a4b0", P: "#e0b070", W: "#f1e3c0", A: "#e8c070", E: "#ffd23f" },
    draw: f => {
      const g = new Grid();
      g.rect(2, 4, 12, 10, "B").rect(2, 4, 12, 2, "L");
      g.rect(3, 8, 10, 1, "D").rect(3, 11, 10, 1, "D").rect(7, 6, 1, 8, "D");
      g.px(3, 5, "S").px(12, 5, "S").px(3, 12, "S").px(12, 12, "S");
      g.rect(2, 13, 12, 1, "D");
      if (f === "b") {
        g.line(4, 6, 8, 10, "D").line(8, 10, 6, 13, "D").px(13, 4, ".").px(13, 5, ".").px(12, 4, ".").px(2, 13, ".").px(3, 13, ".");
      }
      return g;
    },
  },
  barrel: {
    palette: { B: "#82502c", L: "#b07a48", D: "#51321c", S: "#8892a6", P: "#e0b070", W: "#f1e3c0", A: "#e8c070", E: "#ffd23f" },
    draw: f => {
      const g = new Grid();
      g.ell(8, 8.7, 5.2, 5.6, "B").ell(8, 3.6, 3.8, 1.6, "L").ell(8, 13.2, 4, 1.3, "D");
      g.rect(4, 5, 8, 1, "S").rect(3, 11, 10, 1, "S").rect(3, 8, 10, 1, "D");
      g.px(6, 7, "L").px(5, 9, "L").px(6, 13, "L");
      g.line(8, 5, 8, 12, "D");
      if (f === "b") {
        g.line(10, 4, 9, 8, "D").line(9, 8, 11, 12, "D").px(2, 7, ".").px(3, 8, ".").px(13, 10, ".").px(12, 3, ".");
      }
      return g;
    },
  },
  sack: {
    palette: { B: "#c9a77a", L: "#e6cfa2", D: "#8e6f48", S: "#b5582a", P: "#e0b070", W: "#f1e3c0", A: "#e8c070", E: "#ffd23f" },
    draw: f => {
      // A tied burlap sack: a round body, a gathered neck and a red cord.
      const g = new Grid();
      g.ell(8, 10.2, 5.4, 4.6, "B").rect(6, 4, 4, 3, "B").ell(8, 3.2, 2.6, 1.6, "L");
      g.rect(6, 6, 4, 1, "S").px(10, 7, "S").px(11, 8, "S").px(11, 9, "S");
      g.px(5, 9, "L").px(6, 8, "L").px(4, 11, "L").rect(5, 14, 6, 1, "D");
      if (f === "b") {
        g.line(9, 8, 7, 11, "D").line(7, 11, 9, 13, "D").px(12, 12, ".");
      }
      return g;
    },
  },
};

const cache = new Map<string, MobPixels>();

/** The 16 x 16 pixels of a prop; null is transparent. */
export function propPixels(kind: PropKind, frame: PropFrame): MobPixels {
  const key = `${kind}:${frame}`;
  let hit = cache.get(key);
  if (!hit) {
    const def = DEFS[kind];
    hit = compile(def.draw(frame), def.palette);
    cache.set(key, hit);
  }
  return hit;
}
