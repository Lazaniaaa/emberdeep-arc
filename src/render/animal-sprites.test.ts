import { describe, expect, it } from "vitest";
import { CELL_H, CELL_W, frameAt } from "./animal-sprites";

describe("animal sprite sheets", () => {
  it("finds each frame in its row of direction and column of pose", () => {
    expect(frameAt("down", "a")).toEqual({ sx: 0, sy: 0 });
    expect(frameAt("left", "b")).toEqual({ sx: CELL_W, sy: CELL_H });
    expect(frameAt("right", "w")).toEqual({ sx: 3 * CELL_W, sy: 2 * CELL_H });
    expect(frameAt("up", "s")).toEqual({ sx: 4 * CELL_W, sy: 3 * CELL_H });
  });
});
