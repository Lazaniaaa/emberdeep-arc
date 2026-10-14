import { describe, expect, it } from "vitest";
import {
  CAMP_H, CAMP_SPAWN, CAMP_W, CAMP_WALK_MAP, STATIONS, campSolid, facingOf, facingStation, isCampWall, pathTo, pathToStation,
  stationAt, stationNear, stepInCamp, terrainAt,
} from "./camp";
import { NPC_STEP_MS, advanceCrowd, createCrowd, npcPosition } from "./camp-crowd";
import { SPRITES } from "@/render/camp-renderer";
import { PALETTE, SPRITE_SIZE } from "@/render/pixel-art";
import { ITEM_ART, portraitArt } from "@/render/item-art";
import { CLASS_IDS, RARITIES } from "./catalog";
import { CAMP_ART_HEIGHT, CAMP_ART_WIDTH, CAMP_GROUND, CAMP_LIGHTS, CAMP_OBJECTS, CAMP_WATER, footOf, inCampPolygon, objectBox, paintedStationAt } from "./camp-art";

/** Every free cell the delver can reach on foot from the spawn point. */
function reachable() {
  const seen = new Set<number>([CAMP_SPAWN.y * CAMP_W + CAMP_SPAWN.x]);
  const queue = [{ ...CAMP_SPAWN }];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = stepInCamp(p, dx, dy);
      const key = next.y * CAMP_W + next.x;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

describe("camp", () => {
  it("starts the delver at the tunnel mouth on open ground", () => {
    expect(campSolid(CAMP_SPAWN.x, CAMP_SPAWN.y)).toBe(false);
    expect(terrainAt(CAMP_SPAWN.x, CAMP_SPAWN.y)).toBe("path");
    expect(isCampWall(-1, 0)).toBe(true);
    expect(isCampWall(CAMP_W, CAMP_H - 1)).toBe(true);
    expect(campSolid(NaN, 10)).toBe(true);
    expect(campSolid(10, 1.5)).toBe(true);
  });

  it("traces exactly 48 x 32 tiles, with every open tile connected to the spawn", () => {
    expect([CAMP_W,CAMP_H]).toEqual([48,32]);
    expect([CAMP_ART_WIDTH,CAMP_ART_HEIGHT]).toEqual([CAMP_W*32,CAMP_H*32]);
    expect(CAMP_WALK_MAP).toHaveLength(CAMP_H);
    const cells = reachable();
    CAMP_WALK_MAP.forEach((row,y) => {
      expect(row.length, `row ${y}`).toBe(CAMP_W);
      expect(row).toMatch(/^[.#~]+$/);
      for (let x=0;x<CAMP_W;x++) {
        expect(campSolid(x,y)).toBe(row[x] !== ".");
        if (row[x] === ".") expect(cells.has(y*CAMP_W+x), `unreachable tile ${x},${y}`).toBe(true);
      }
    });
  });

  it("keeps footprints, water and rock solid but the seven unique door tiles open", () => {
    const taken = new Set<string>();
    for (const thing of STATIONS) {
      expect(campSolid(thing.x, thing.y)).toBe(false);
      expect(isCampWall(thing.x, thing.y)).toBe(false);
      const key = `${thing.x},${thing.y}`;
      expect(taken.has(key)).toBe(false);
      taken.add(key);
    }
    expect(stationAt(24, 7)?.id).toBe("gate");
    expect(stationAt(24, 8)).toBeNull();
    expect(terrainAt(4, 25)).toBe("water");
    // Inside the gate, the hall, the altar, the armory, the vault, the board, the sign, the fire and the tent.
    for (const [x,y] of [[24,4],[11,8],[6,15],[36,8],[42,15],[36,21],[26,22],[24,15],[15,18],[4,25],[24,26]]) expect(campSolid(x,y), `${x},${y}`).toBe(true);
  });

  it("stands every object on the cave's floor, on its own tiles, with each building's door just in front of it", () => {
    const tiles = new Map<string, string>();
    const ids = new Set<string>();
    for (const o of CAMP_OBJECTS) {
      expect(ids.has(o.id), o.id).toBe(false); ids.add(o.id);
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) {
        expect(CAMP_GROUND[y][x], `${o.id} at ${x},${y} is not on floor`).toBe(".");
        expect(tiles.get(`${x},${y}`), `${o.id} overlaps ${tiles.get(`${x},${y}`)}`).toBeUndefined();
        tiles.set(`${x},${y}`, o.id);
        expect(campSolid(x, y)).toBe(true);
      }
    }
    for (const s of STATIONS) {
      const b = CAMP_OBJECTS.find(o => o.station === s.id)!;
      expect(b, s.id).toBeDefined();
      // The door touches the building's footprint from outside.
      const dx = Math.max(b.x - s.x, 0, s.x - (b.x + b.w - 1)), dy = Math.max(b.y - s.y, 0, s.y - (b.y + b.h - 1));
      expect(dx + dy, `${s.id} door`).toBe(1);
    }
  });

  it("allows a direct step away from every door", () => {
    for (const [x,y,dx,dy] of [[24,7,0,1],[11,11,0,1],[9,15,1,0],[37,11,0,1],[39,15,-1,0],[37,19,0,-1],[25,23,-1,0]]) {
      expect(stepInCamp({x,y},dx,dy), `${x},${y}`).toEqual({x:x+dx,y:y+dy});
    }
  });

  it("lets the delver walk up to every building", () => {
    const cells = reachable();
    for (const s of STATIONS) expect(cells.has(s.y*CAMP_W+s.x), s.id).toBe(true);
  });

  it("does not move the delver into a wall or a building, but still turns them", () => {
    expect(stepInCamp({ x: 24, y: 24 }, -1, 0)).toEqual({ x: 23, y: 24 });
    expect(stepInCamp({ x: 24, y: 13 }, 0, 1)).toEqual({ x: 24, y: 13 });
    expect(stepInCamp({ x: 24, y: 24 }, 0, 1)).toEqual({ x: 24, y: 24 });
    expect(facingOf(-1, 0, "up")).toBe("left");
    expect(facingOf(0, 0, "down")).toBe("down");
  });

  it("offers the building you face first, then any that touches you", () => {
    expect(stationNear({ x: 24, y: 8 }, "up")?.id).toBe("gate");
    expect(stationNear({ x: 24, y: 8 }, "left")?.id).toBe("gate");
    expect(stationNear({ x: 24, y: 7 }, "down")?.id).toBe("gate");
    expect(stationNear(CAMP_SPAWN, "up")).toBeNull();
  });

  it("plans a walk around obstacles to a tapped tile and to a building", () => {
    const path = pathTo(CAMP_SPAWN, { x: 24, y: 12 })!;
    expect(path.at(-1)).toEqual({ x: 24, y: 12 });
    // The fire sits between them, so the walk has to detour and cannot be a straight line.
    expect(path.length).toBeGreaterThan(12);
    for (const cell of path) expect(campSolid(cell.x, cell.y)).toBe(false);
    expect(pathTo(CAMP_SPAWN, { x: 24, y: 15 })).toBeNull();
    expect(pathTo(CAMP_SPAWN, CAMP_SPAWN)).toEqual([]);

    for (const s of STATIONS) {
      const walk = pathToStation(CAMP_SPAWN, s)!;
      expect(walk).not.toBeNull();
      const end = walk.at(-1) ?? CAMP_SPAWN;
      expect(stationNear({ x: end.x, y: end.y }, facingStation(end, s))?.id).toBe(s.id);
    }
    expect(pathToStation({ x: 24, y: 8 }, STATIONS[0])).toEqual([]);
    expect(pathToStation(STATIONS[0], STATIONS[0])).toEqual([]);
  });
});

describe("camp map", () => {
  it("keeps every object, light and water outline within the ground picture", () => {
    expect(CAMP_GROUND).toHaveLength(CAMP_H);
    for (const row of CAMP_GROUND) expect(row).toMatch(new RegExp(`^[.#~]{${CAMP_W}}$`));
    for (const o of CAMP_OBJECTS) {
      const b = objectBox(o);
      expect(b.x, o.id).toBeGreaterThanOrEqual(0); expect(b.x + b.w, o.id).toBeLessThanOrEqual(CAMP_ART_WIDTH);
      expect(b.y, o.id).toBeGreaterThanOrEqual(0); expect(footOf(o).y, o.id).toBeLessThanOrEqual(CAMP_ART_HEIGHT);
    }
    for (const [x,y] of CAMP_WATER.flatMap(w => w.polygon)) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(CAMP_ART_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(CAMP_ART_HEIGHT);
    }
    for (const light of CAMP_LIGHTS) {
      expect(light.x).toBeGreaterThanOrEqual(0); expect(light.x).toBeLessThanOrEqual(CAMP_ART_WIDTH);
      expect(light.y).toBeGreaterThanOrEqual(0); expect(light.y).toBeLessThanOrEqual(CAMP_ART_HEIGHT);
      expect(light.radius).toBeGreaterThan(0);
      expect(light.rgb).toMatch(/^\d+,\d+,\d+$/);
    }
  });

  it("opens a building tapped anywhere on its picture, and nothing for the floor around it", () => {
    for (const o of CAMP_OBJECTS.filter(o => o.station)) {
      const b = objectBox(o);
      expect(paintedStationAt(b.x + b.w / 2, b.y + b.h / 2), o.id).toBe(o.station);
    }
    expect(paintedStationAt(20, 20)).toBeNull();
    expect(paintedStationAt(770, 700)).toBeNull();
    expect(inCampPolygon(5,5,[[0,0],[10,0],[10,10],[0,10]])).toBe(true);
    expect(inCampPolygon(15,5,[[0,0],[10,0],[10,10],[0,10]])).toBe(false);
  });
});

describe("camp crowd", () => {
  it("keeps every ambient delver on open, separate ground", () => {
    const crowd = createCrowd(11, 0);
    for (const npc of crowd.npcs) expect(campSolid(npc.x,npc.y), `spawn ${npc.name}`).toBe(false);
    for (let now = 0; now < 120_000; now += 250) {
      advanceCrowd(crowd, now, [{ x: CAMP_SPAWN.x, y: CAMP_SPAWN.y }]);
      const seen = new Set<string>();
      for (const npc of crowd.npcs) {
        expect(campSolid(npc.x, npc.y)).toBe(false);
        const key = `${npc.x},${npc.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(Math.abs(npc.x - npc.homeX) + Math.abs(npc.y - npc.homeY)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("actually wanders, chats and lets the elder pass on tips", () => {
    const crowd = createCrowd(3, 0);
    const start = crowd.npcs.map(n => `${n.x},${n.y}`);
    const spoke = new Set<string>();
    for (let now = 0; now < 60_000; now += 250) {
      advanceCrowd(crowd, now);
      for (const n of crowd.npcs) if (n.say) spoke.add(n.say);
    }
    expect(crowd.npcs.filter((n, i) => `${n.x},${n.y}` !== start[i] && n.kind !== "elder").length).toBeGreaterThan(3);
    expect(spoke.size).toBeGreaterThan(3);
  });

  it("tweens a step over the step time and stays put otherwise", () => {
    const crowd = createCrowd(5, 0);
    const npc = crowd.npcs[0];
    npc.fromX = npc.x - 1; npc.fromY = npc.y; npc.movedAt = 1000;
    expect(npcPosition(npc, 1000).x).toBeCloseTo(npc.x - 1);
    expect(npcPosition(npc, 1000 + NPC_STEP_MS / 2).x).toBeCloseTo(npc.x - 0.5);
    expect(npcPosition(npc, 1000 + NPC_STEP_MS).walking).toBe(false);
  });
});

describe("camp art", () => {
  it("draws every sprite as a full 16-wide grid using known colors", () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows, name).toHaveLength(SPRITE_SIZE);
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(SPRITE_SIZE);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${name} row ${i} '${ch}'`).toBeDefined();
      });
    }
  });

  it("gives every weapon, armor, potion and Delver a well-formed picture", () => {
    const check = (name: string, rows: readonly string[]) => {
      expect(rows, name).toHaveLength(SPRITE_SIZE);
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(SPRITE_SIZE);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${name} row ${i} '${ch}'`).toBeDefined();
      });
      expect(rows.join("").replace(/\./g, "").length, `${name} is not empty`).toBeGreaterThan(20);
    };
    for (const [name, rows] of Object.entries(ITEM_ART)) check(name, rows);
    for (const kind of [...CLASS_IDS, "wanderer" as const]) for (const rarity of RARITIES) check(`${kind}/${rarity}`, portraitArt(kind, rarity));
    expect(portraitArt("seer", "legendary").join("")).not.toBe(portraitArt("seer", "common").join(""));
  });
});
