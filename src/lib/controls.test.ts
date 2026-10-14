import { describe, expect, it } from "vitest";
import { isActKey, moveOf } from "./controls";

describe("controls", () => {
  it("move with WASD and the arrows in any keyboard layout", () => {
    expect(moveOf({ key: "w", code: "KeyW" })).toEqual([0, -1]);
    // A Ukrainian layout types ц ф і в on W A S D: the key's place still counts.
    expect(moveOf({ key: "ц", code: "KeyW" })).toEqual([0, -1]);
    expect(moveOf({ key: "ф", code: "KeyA" })).toEqual([-1, 0]);
    expect(moveOf({ key: "і", code: "KeyS" })).toEqual([0, 1]);
    expect(moveOf({ key: "в", code: "KeyD" })).toEqual([1, 0]);
    expect(moveOf({ key: "ArrowLeft", code: "ArrowLeft" })).toEqual([-1, 0]);
    expect(moveOf({ key: "q", code: "KeyQ" })).toBeUndefined();
  });

  it("act with E in any layout", () => {
    expect(isActKey({ key: "e", code: "KeyE" })).toBe(true);
    expect(isActKey({ key: "у", code: "KeyE" })).toBe(true);
    expect(isActKey({ key: "r", code: "KeyR" })).toBe(false);
  });
});
