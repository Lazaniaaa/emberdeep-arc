import { describe, expect, it } from "vitest";
import { breakingFrame, PROP_CELL_H, PROP_CELL_W, stagesOf, standingFrame } from "./prop-sheets";
import type { Sheet } from "./sheets";

/** A loaded strip of n frames at twice the game's density, as the script writes it. */
const strip = (n: number) => ({ image: { naturalWidth: n * PROP_CELL_W * 2, naturalHeight: PROP_CELL_H * 2 } }) as unknown as Sheet;

describe("a prop's frames", () => {
  it("split into the whole prop, stages of cracks and stages of breaking apart", () => {
    expect(stagesOf(1)).toEqual({ cracks: 0, breaks: 0 });
    expect(stagesOf(3)).toEqual({ cracks: 1, breaks: 1 });
    expect(stagesOf(6)).toEqual({ cracks: 2, breaks: 3 });
  });

  it("show the prop whole until it is hit, then cracks by how many blows it has taken", () => {
    expect(standingFrame(strip(1), 1, 2)).toBe(0);
    expect(standingFrame(strip(3), 2, 2)).toBe(0);
    expect(standingFrame(strip(3), 1, 2)).toBe(1);
    expect(standingFrame(strip(6), 2, 2)).toBe(0);
    expect(standingFrame(strip(6), 1, 2)).toBe(1);
    expect(standingFrame(strip(6), 1, 4)).toBe(2);
  });

  it("break apart from the stage the prop stood at to the last frame", () => {
    expect(breakingFrame(strip(1), 0.5)).toBeNull();
    // Broken at one blow: every crack and every stage of breaking.
    expect([0, 0.2, 0.4, 0.6, 0.8, 0.99].map(k => breakingFrame(strip(6), k, 1, 1))).toEqual([1, 2, 3, 4, 5, 5]);
    expect([0, 0.5, 0.99].map(k => breakingFrame(strip(3), k, 1, 1))).toEqual([1, 2, 2]);
    // Broken at the second blow: it stood cracked, so the rest plays.
    expect([0, 0.5, 0.99].map(k => breakingFrame(strip(6), k, 1, 2))).toEqual([2, 4, 5]);
  });
});
