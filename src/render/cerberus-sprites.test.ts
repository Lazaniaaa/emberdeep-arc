import { describe, expect, it } from "vitest";
import type { Dimling } from "@/game/dungeon";
import { cerberusFacing, cerberusFrame } from "./cerberus-sprites";

const boss: Dimling = { id: 1, x: 5, y: 5, size: 2, hp: 150, maxHp: 150, awake: true, boss: true };

describe("Cerberus sheet", () => {
  it("faces the player from the centre of its whole body in all four directions", () => {
    expect(cerberusFacing(boss,{x:5,y:9})).toBe("down");
    expect(cerberusFacing(boss,{x:4,y:6})).toBe("left");
    expect(cerberusFacing(boss,{x:8,y:6})).toBe("right");
    expect(cerberusFacing(boss,{x:6,y:4})).toBe("up");
  });
  it("selects every supplied row and state without mirroring or reading a neighbouring cell", () => {
    for(const [row,facing] of (["down","left","right","up"] as const).entries()) {
      for(const [col,frame] of (["a","b","w","s"] as const).entries()) {
        expect(cerberusFrame(facing,frame)).toEqual({x:col*256,y:row*224});
      }
    }
  });
});
