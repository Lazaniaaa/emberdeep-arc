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

  it("show the prop whole until it is hit, then cracks by how much it has lost", () => {
    expect(standingFrame(strip(1), 3, 10)).toBe(0);
    expect(standingFrame(strip(3), 10, 10)).toBe(0);
    expect(standingFrame(strip(3), 2, 10)).toBe(1);
    expect(standingFrame(strip(6), 10, 10)).toBe(0);
    expect(standingFrame(strip(6), 7, 10)).toBe(1);
    expect(standingFrame(strip(6), 4, 10)).toBe(2);
  });

  it("break apart frame by frame, and not at all from a strip without such frames", () => {
    expect(breakingFrame(strip(1), 0.5)).toBeNull();
    expect([0, 0.5, 0.99].map(k => breakingFrame(strip(3), k))).toEqual([2, 2, 2]);
    expect([0, 0.34, 0.67, 0.99].map(k => breakingFrame(strip(6), k))).toEqual([3, 4, 5, 5]);
  });
});
