# Brief: the painted cave lobby

A task for a coding agent working in this repository. Read `HANDOFF.md` first (sections 2 and 4 hold the owner's rules), then
this brief. The owner writes in Ukrainian; code, comments and commits are in English.

## Current curb behaviour — 2026-10-15

Stone curbs block walking. `CAMP_CURBS` drives the cached picture and edge collisions in `camp.ts`. Each corridor
contains two complete 32px paved tiles: `campCurbBox` places the eight-pixel stone strips OUTSIDE that paving,
with the inside face exactly on the blocked tile boundary. Corner knees stay outside too. No inset toe clamp remains.
`CAMP_CURB_OPENINGS` contains exact tunnel edges; internal building/path joins must not erase their sideways border.
Keyboard movement, tap routes, NPCs and reachability use the same barriers. Moss beyond closed curbs is scenery.
The Vault, its footprint and pad moved up one tile (foot y=502, footprint y=12); its west door stays at (39,15).
Enclosed rear paving below Altar/Vault remains inaccessible, while every building door is reachable.
Regression checks cover all corridor lanes, the whole contour, zero curb overlap on paving, seven rendered 64px
cross-sections, the three owner-marked gaps and blocked keyboard/tap attempts on desktop and phone viewports.

The original implementation brief and dated notes below describe earlier stages of the lobby.

## The goal

The lobby (the walkable camp in `src/game/camp.ts`, drawn by `src/render/camp-renderer.ts`, run by
`src/components/camp-scene.tsx`) is drawn today from code: pink flagstones, teal moss, tiny 16 x 16 buildings. Replace its
look with the approved painting, `art/lobby/raw/camp-v1.webp` (1536 x 1024): an underground camp in a cavern.

It must not look like a picture with a cat sliding over it. It should play like a game with a painted map:

1. **The painting is the ground.** One picture, drawn 1:1 in world pixels: 1 picture pixel = 1 world pixel, a tile is 32 px, so
   the camp becomes **48 x 32 tiles** (today 40 x 26). The camera, zoom and scrolling already work for any camp size.
2. **Walls, water and buildings are solid exactly where they are painted.** Replace the generated terrain (`buildTerrain`)
   with a hand-authored 48 x 32 walk map: an array of 32 strings of 48 chars in `camp.ts` (`.` open, `#` rock, `~` water, and
   the building footprints solid). Easy to read and fix by hand. Trace it against `art/lobby/camp-v1-grid.png` (the painting
   with the 32 px grid and tile numbers every 4 tiles).
3. **The delver walks behind things, not over them.** The buildings, the arch of the gate, the tent, the lamp posts, the
   banners and the tall rocks are cut out of the same painting as occluders: for each, a polygon in picture pixels and a
   baseline (the y of its foot). Draw the painting, then the delvers and the occluders sorted by baseline, so whatever
   stands in front of the delver covers them. An occluder is drawn by clipping the same painting to its polygon (no new
   art needed). Keep the polygons in a small table in `camp.ts` or a new `camp-art.ts`.
4. **What glows, moves.** On top, from code, with the existing `glow()` style (`lighter` radial gradients) and small
   particles: the campfire flames and sparks; every torch and lantern flickering; the crystals pulsing slowly; the water
   of the pool and the waterfalls shimmering; the green light in the gate breathing; a faint blue draught at the tunnel.
   A table of points (x, y, colour, radius, kind) is enough. Honour `reducedMotion` (still glow, no flicker).
5. **Light.** A soft darkness over the edges of the cavern with light pools around the fire, the lamps and the delver
   (like the light radius on the cave floors in `src/render/renderer.ts`, but gentler: the camp is a safe, lit place).
6. **The buildings stay interactive.** Every station keeps its id, name, blurb and panel. Walking up to its door tile (or
   tapping the building) opens it as today. When near, the building brightens (draw its occluder again with `lighter` at
   low alpha, as `drawStation` does now) and its name floats above it. "START HERE" stays over the gate for a new delver.
7. **The crowd keeps working.** The other delvers (`src/game/camp-crowd.ts`) wander on open ground via `campSolid`; check
   they spawn and walk only on open tiles of the new map.
8. **A fallback.** Until the picture has loaded (or if it fails), draw the old code camp, as the cave floors do with
   `mapArtwork` in `renderer.ts`.

## The painting, tile by tile (approximate; check against the grid image)

Tiles are (x, y) on the 48 x 32 grid; one tile = 32 picture pixels.

| What | Where in tiles | Door / where to stand to open it |
| --- | --- | --- |
| Dungeon Gate (`gate`): stone arch, green glow, stairs | x 20-28, y 0-8 | the top of the stairs, about (24, 8); stand at (24, 9) |
| Hall of Delvers (`hall`): crowned statue, trophies, violet | x 5-15, y 2-10 | the front steps, about (10, 10) |
| Ember Altar (`altar`): floating magenta crystal on a round dais | x 2-12, y 13-20 | the front of the dais, about (7, 19) |
| Armory (`armory`): forge, weapon rack, anvil | x 31-40, y 4-11 | by the anvil, about (36, 11) |
| Vault (`ledger`): round gold-trimmed door in a stone wall | x 36-46, y 12-18 | the steps, about (42, 17) |
| Draw Board (`board`): notice board and prize wheel | x 34-42, y 18-24 | in front of the rug, about (37, 23) |
| Welcome Board (`guide`): signpost with a cyan "?" | x 28-30, y 23-27 | beside the post, about (27, 25) |
| Campfire with benches (solid, the heart of the plaza) | about (24, 17), ring x 19-29, y 13-21 | - |
| Tent (decoration, solid) | x 14-19, y 15-20 | - |
| Tunnel from the surface (spawn) | x 22-26, y 24-31 | spawn at the mouth, about (24, 24), facing up |
| Pool and waterfall, bottom left (water, solid) | x 2-13, y 22-30 | - |
| Waterfall and stream, top right (water, solid) | x 43-47, y 3-9 | - |

Open ground: the plaza ring, the stone paths (to the gate up the middle, left to the hall and the altar, right to the armory,
the vault and the board, down to the tunnel) and the dirt around each building. Rock everywhere else.

## Code to change

- `src/game/camp.ts`: `CAMP_W`/`CAMP_H` (48 x 32), the walk map instead of `buildTerrain` (keep `terrainAt`, `isCampWall`,
  `campSolid`, `stepInCamp`, `stationNear`, `pathTo`, `pathToStation` working with the same signatures), the new `STATIONS`
  coordinates (x, y = the door tile; a building's solid footprint comes from the walk map), `CAMP_SPAWN`, `PLAZA`.
  `CAMP_PROPS` (code-drawn fire, lamps, crystals, mushrooms, crates, rocks) go away with the painting, except where the
  fallback still needs them.
- `src/render/camp-renderer.ts`: load the picture (copy it to `public/maps/camp.webp`), draw it as the ground, then the
  sorted delvers and occluders, the animated glows and the light; labels and bubbles stay on top. Keep the old drawing as the
  fallback.
- `src/components/camp-scene.tsx`: only if the spawn, the facing or the camera need it.
- `src/game/camp.test.ts`: update for the new map and add tests: the spawn is open; every station's door tile is open and
  reachable from the spawn; every station is touched by some open tile; the walk map is exactly 48 x 32 and uses only known
  characters; every occluder polygon lies inside the picture; every ambient delver starts on open ground.

## Rules

- No new dependencies. Pixel art stays sharp: whole-number zoom, `imageSmoothingEnabled = false`.
- Before handing back: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint` (3 old warnings are known) must pass.
- Check it in a browser at 1280 x 800 and at a phone size (375 x 812): walk behind the hall, the armory and the gate, open
  every building, look at the fire. The dev server is `npm run dev` (port 5741); Playwright runs with Edge
  (`SMOKE_CHANNEL=msedge`).
- Don't deploy anything, don't ask for or handle any keys or seed phrases, don't push. Commit only when the owner asks.
- Update `HANDOFF.md` (section 5, the state; section 7, where things are) when done.
- Talk to the owner in Ukrainian, briefly, one concrete step at a time (see HANDOFF section 2).

## Implemented — 2026-10-13

The painting is now `public/maps/camp.webp`, byte-identical to its approved source, at native world size.
`CAMP_WALK_MAP` is a literal 48 x 32 map; all open ground and every station door are reachable from (24,24).
The traced doors are gate (24,9), hall (10,11), altar (7,20), armory (36,11), ledger (42,18), board (37,23), guide (27,25).
These slightly refine the approximate coordinates above to stand in front of the painted bases.

`src/game/camp-art.ts` holds the occlusion silhouettes, baseline depths, label positions, lights and water outlines.
The gate arch has three separate cuts, leaving the portal and stairs open; its interaction outline still includes the portal.
Cutouts and static lighting are cached. The code camp remains a fallback using the same map and doors.

Browser QA (dev server required):

```powershell
$env:SMOKE_CHANNEL = 'msedge'
node scripts/camp-smoke.mjs http://127.0.0.1:5741/ artifacts/camp
```

It uses isolated contexts and checks desktop 1280 x 800, phone 375 x 812, every panel via buttons/E/painted taps,
ground tapping, keyboard/D-pad movement, actual sprite occlusion, frozen reduced-motion effects, animation changes,
zero-sized canvases and a missing-image fallback. No wallet connection or simulated purchase is performed.
Results are saved in `docs/lobby-qa.json`; current screenshots are `docs/screenshots/camp.png` and `camp-mobile.png`.
Render timings in that report measure desktop canvas command submission, not physical-phone GPU or battery use.

### Collision corrections — 2026-10-13

The initial reachability tests missed floor tiles incorrectly marked solid. The owner found these beside the fire and
anvil. The whole walk map was reviewed against the painting using the foot anchor (tile x + 16, tile y + 30): 43 floor
tiles were opened, and 14 actual object-base tiles were blocked. The painting itself is unchanged.
Hall has separate upright cuts; Armory excludes its floor and keeps the anvil/rack/crates separate. Altar and Vault
steps no longer paint over a standing delver. The tall pillar and adjacent crate/rock west of Vault also have depth cuts.

Tests now include independent painted-floor fixtures and literal direct moves. Browser QA checks 12 direct floor steps
at each viewport, a forge-floor tap that must move rather than open Armory, and visible sprite pixels in 11 clear-floor
positions. `CAMP_QA_RENDER_ONLY=1` reruns just rendering/fallback fixtures after a cutout adjustment; it does not test UI.
