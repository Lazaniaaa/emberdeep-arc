import { describe, expect, it } from "vitest";
import { lightRadius } from "./config";
import { NO_PERKS } from "./catalog";
import { creatureNoticeDistance, currentRadius, emptyBag, startRun } from "./run";

describe("low-light visibility",()=>{
  it("keeps the full radius down to 25 light, then narrows gradually",()=>{
    for(const light of [25,25.01,50,80,100,400])expect(lightRadius(light)).toBe(5);
    for(const [light,radius] of [[24.99,4],[20,4],[19.99,3],[10,3],[9.99,2],[5,2],[4.99,1],[0,1],[-1,1]]) {
      expect(lightRadius(light),`${light} light`).toBe(radius);
    }
  });
  it("keeps radius perks and the separate Night Vision rule",()=>{
    const s=startRun({seed:1,flasks:1,weaponDamage:8,bag:emptyBag(),perks:{...NO_PERKS,radius:1}});
    s.light=25;expect(currentRadius(s)).toBe(6);
    s.light=20;expect(currentRadius(s)).toBe(5);
    s.light=0;s.nightVision=5;expect(currentRadius(s)).toBe(2);
  });
  it("does not make enemies wake earlier merely because the player can see farther",()=>{
    const s=startRun({seed:1,flasks:1,weaponDamage:8,bag:emptyBag(),perks:{...NO_PERKS}});
    s.light=80;expect(creatureNoticeDistance(s)).toBe(6);
    s.light=25;expect(creatureNoticeDistance(s)).toBe(4);
    s.light=24;expect(creatureNoticeDistance(s)).toBe(3);
    expect(currentRadius(s)).toBe(4);
    s.perks.stealth=true;expect(creatureNoticeDistance(s)).toBe(1);
  });
});
