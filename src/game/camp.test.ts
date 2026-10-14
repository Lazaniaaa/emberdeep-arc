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
import { CAMP_ART_HEIGHT, CAMP_ART_WIDTH, CAMP_LIGHTS, CAMP_OCCLUDERS, CAMP_WATER, inCampPolygon, paintedStationAt } from "./camp-art";

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
    expect(stationAt(24, 9)?.id).toBe("gate");
    expect(stationAt(24, 10)).toBeNull();
    expect(terrainAt(5, 26)).toBe("water");
    for (const [x,y] of [[5,26],[7,16],[10,7],[24,17],[17,18],[36,8],[33,9],[35,10],[14,10],[42,15],[37,21],[24,16],[16,23],[20,24],[36,16],[37,16]]) expect(campSolid(x,y), `${x},${y}`).toBe(true);
  });

  it("leaves the independently traced painted floor open around every camp zone", () => {
    // Reviewed foot positions in the source painting, not inferred from the walk map or BFS.
    const floor = [[9,9],[10,9],[11,9],[14,11],[15,11],[16,11],
      [32,10],[33,10],[34,10],[37,10],[39,10],[40,10],
      [20,12],[33,12],[20,13],[19,14],[29,14],[41,16],[42,16],
      [21,18],[22,18],[25,18],[13,19],[14,19],[15,19],[16,19],[17,19],[18,19],
      [13,20],[14,21],[27,21],[16,22],[17,22],[43,22],[44,22],[44,23],
      [19,24],[30,24],[27,26],[28,26],[29,26],[7,19]];
    for (const [x,y] of floor) expect(campSolid(x,y), `painted floor ${x},${y}`).toBe(false);
    // Floor, but a delver there would stand inside the Welcome Board's hanging sign, behind the Draw Board's lamp post or
    // the west brazier, hidden whole: those few are closed.
    for (const [x,y] of [[28,24],[29,24],[28,25],[29,25],[34,19],[35,19],[21,20]]) expect(campSolid(x,y), `hidden ${x},${y}`).toBe(true);
  });

  it("allows a direct step beside the anvil, fire, stairs and lower camp instead of a detour", () => {
    for (const [x,y,dx,dy] of [[34,11,0,-1],[37,11,0,-1],[40,11,0,-1],
      [21,18,1,0],[25,18,1,0],[10,10,0,-1],[42,17,0,-1],
      [15,22,1,0],[28,26,1,0]]) {
      expect(stepInCamp({x,y},dx,dy), `${x},${y}`).toEqual({x:x+dx,y:y+dy});
    }
  });

  it("lets the delver walk up to every building", () => {
    const cells = reachable();
    for (const s of STATIONS) {
      expect(cells.has(s.y*CAMP_W+s.x), s.id).toBe(true);
      const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (s.y + dy) * CAMP_W + s.x + dx);
      expect(neighbours.some(k => cells.has(k))).toBe(true);
    }
  });

  it("does not move the delver into a wall or a building, but still turns them", () => {
    expect(stepInCamp({ x: 24, y: 24 }, -1, 0)).toEqual({ x: 23, y: 24 });
    expect(stepInCamp({ x: 24, y: 15 }, 0, 1)).toEqual({ x: 24, y: 15 });
    expect(stepInCamp({ x: 24, y: 31 }, 0, 1)).toEqual({ x: 24, y: 31 });
    expect(facingOf(-1, 0, "up")).toBe("left");
    expect(facingOf(0, 0, "down")).toBe("down");
  });

  it("offers the building you face first, then any that touches you", () => {
    expect(stationNear({ x: 24, y: 10 }, "up")?.id).toBe("gate");
    expect(stationNear({ x: 24, y: 10 }, "left")?.id).toBe("gate");
    expect(stationNear({ x: 24, y: 9 }, "down")?.id).toBe("gate");
    expect(stationNear(CAMP_SPAWN, "up")).toBeNull();
  });

  it("plans a walk around obstacles to a tapped tile and to a building", () => {
    const path = pathTo(CAMP_SPAWN, { x: 24, y: 12 })!;
    expect(path.at(-1)).toEqual({ x: 24, y: 12 });
    // The fire sits between them, so the walk has to detour and cannot be a straight line.
    expect(path.length).toBeGreaterThan(12);
    for (const cell of path) expect(campSolid(cell.x, cell.y)).toBe(false);
    expect(pathTo(CAMP_SPAWN, { x: 24, y: 17 })).toBeNull();
    expect(pathTo(CAMP_SPAWN, CAMP_SPAWN)).toEqual([]);

    for (const s of STATIONS) {
      const walk = pathToStation(CAMP_SPAWN, s)!;
      expect(walk).not.toBeNull();
      const end = walk.at(-1) ?? CAMP_SPAWN;
      expect(end).toEqual({ x: s.x, y: s.y });
      expect(stationNear({ x: end.x, y: end.y }, facingStation(end, s))?.id).toBe(s.id);
    }
    expect(pathToStation({ x: 24, y: 10 }, STATIONS[0])).toEqual([]);
    expect(pathToStation(STATIONS[0], STATIONS[0])).toEqual([]);
  });
});

describe("painted camp geometry", () => {
  it("keeps every cutout, light and water outline within the source painting", () => {
    const ids = new Set<string>();
    for (const cut of CAMP_OCCLUDERS) {
      expect(ids.has(cut.id)).toBe(false); ids.add(cut.id);
      expect(cut.polygon.length).toBeGreaterThanOrEqual(3);
      expect(cut.baseline).toBeGreaterThan(0);
      expect(cut.baseline).toBeLessThanOrEqual(CAMP_ART_HEIGHT);
    }
    for (const polygon of [...CAMP_OCCLUDERS.flatMap(c=>c.hitPolygon ? [c.polygon,c.hitPolygon] : [c.polygon]),...CAMP_WATER.map(w=>w.polygon)]) for (const [x,y] of polygon) {
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

  it("hits all seven painted stations without treating surrounding rock as a building", () => {
    for (const [id,x,y] of [["gate",770,160],["hall",331,220],["altar",215,580],["armory",1185,285],["ledger",1360,488],["board",1190,665],["guide",915,785]] as const) {
      expect(paintedStationAt(x,y)).toBe(id);
    }
    expect(paintedStationAt(20,20)).toBeNull();
    expect(paintedStationAt(770,714)).toBeNull();
    for (const x of [32,33,34,37,39,40]) expect(paintedStationAt(x*32+16,350), `forge floor ${x}`).toBeNull();
    expect(inCampPolygon(5,5,[[0,0],[10,0],[10,10],[0,10]])).toBe(true);
    expect(inCampPolygon(15,5,[[0,0],[10,0],[10,10],[0,10]])).toBe(false);
    // The arch has an actual hole: it remains interactive without re-painting the portal over a walking delver.
    expect(CAMP_OCCLUDERS.filter(c=>c.station === "gate").some(c=>inCampPolygon(770,180,c.polygon))).toBe(false);
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
