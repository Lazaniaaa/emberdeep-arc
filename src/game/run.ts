import {
  BOSS_DRAIN, BOSS_MOVE_FACTOR, ENEMY_HIT_MULT, ENEMY_RECOVERY, FLASK_LIGHT, KILL_GOLD, HEAL_LIGHT, HOARD_CRYSTALS, HOARD_GOLD, HOARD_SIGIL_CHANCE,
  NIGHT_VISION_STEPS, RAGE_HITS, RAGE_MULT, REGEN_TURNS, SIGIL_DROP_CHANCE, TICKET_DROP_CHANCE, WARD_STEPS, lightRadius, lootMultiplier,
  stepCost,
} from "./config";
import { POTIONS, POTION_DROP_WEIGHTS, type Perks, type PotionId } from "./catalog";
import { dimlingDistance, distances, footprint, generateFloor, idx, isFloor, visibleSet, type Dimling, type Floor, type Point, type Prop } from "./dungeon";
import { attackTiles, reachDirection } from "./enemy-ai";
import { enemyDef, enemyName } from "./enemies";
import { BOSS_XP, CHEST_XP, HOARD_XP, LEVEL_DAMAGE, MAX_LEVEL, VAULT_XP, killXp, levelDamage, xpToNext } from "./levels";
import { GEAR, GEAR_DUPLICATE_XP, GEAR_IDS, gearDamage, lanternFullness, oilChance, propDef, type GearId } from "./props";
import { noteLight, tuning } from "./tuning";
import { chance, createRng, int, weighted, type Rng } from "./rng";

export type RunEvent =
  | "step" | "bump" | "gold" | "crystal" | "oil" | "chest" | "vault" | "sigil"
  | "hit" | "kill" | "boss" | "hoard" | "drain" | "sealed" | "descend" | "potion" | "nightVision" | "dark" | "extract" | "ticket"
  /** A creature started winding up: its next blow is marked on the floor. */
  | "warn"
  /** A creature struck and the delver had stepped aside. */
  | "miss"
  /** A prop was hit and cracked; it broke; a piece of gear came out of one; the delver reached a new level. */
  | "smash" | "break" | "gear" | "levelup";

export type PotionBag = Record<PotionId, number>;

export const emptyBag = (): PotionBag => ({ nightVision: 0, oil: 0, flare: 0, ward: 0, rage: 0, regen: 0, heal: 0 });

export type RunState = {
  seed: number;
  rng: Rng;
  depth: number;
  floor: Floor;
  player: Point & { facing: "left" | "right" | "up" | "down" };
  light: number;
  startLight: number;
  steps: number;
  kills: number;
  gold: number;
  crystals: number;
  sigils: number;
  /** Raffle tickets found this descent. Lost if the light dies. */
  tickets: number;
  ticketChance: number;
  bag: PotionBag;
  used: PotionBag;
  found: PotionBag;
  nightVision: number;
  ward: number;
  perks: Perks;
  weaponDamage: number;
  status: "playing" | "dead" | "extracted";
  messages: string[];
  events: RunEvent[];
  deepest: number;
  /** Cerberus was killed this descent. Saves from before the boss existed omit it. */
  bossSlain?: boolean;
  /** Identifies the paid descent. Saves from before it existed omit it. */
  runId?: string;
  /** Blows left under a Rage Potion. */
  rage?: number;
  /** Turns of Regeneration left. */
  regen?: number;
  /** Experience toward the next level and the level itself (see levels.ts). Saves from before levels omit both: level 1. */
  xp?: number;
  level?: number;
  /** Gear found in props this descent (see props.ts). */
  gear?: GearId[];
  /** Props broken this descent. */
  smashed?: number;
};

export type RunAction =
  | { type: "move"; dx: number; dy: number }
  | { type: "wait" }
  | { type: "potion"; id: PotionId }
  | { type: "descend" }
  | { type: "extract" };

export type RunSetup = {
  seed: number;
  flasks: number;
  perks: Perks;
  weaponDamage: number;
  bag: PotionBag;
  ticketChance?: number;
  /** Ties this descent to the payment that started it, so its result can only be settled once. */
  runId?: string;
};

export function startRun(setup: RunSetup): RunState {
  const rng = createRng(setup.seed);
  const floor = generateFloor(rng, 1, { findPct: setup.perks.findPct });
  const light = setup.flasks * FLASK_LIGHT + setup.perks.startLight;
  const state: RunState = {
    seed: setup.seed, rng, depth: 1, floor,
    player: { ...floor.spawn, facing: "right" },
    light, startLight: light, steps: 0, kills: 0, gold: 0, crystals: 0, sigils: 0,
    tickets: 0, ticketChance: setup.ticketChance ?? TICKET_DROP_CHANCE,
    bag: { ...setup.bag }, used: emptyBag(), found: emptyBag(),
    nightVision: 0, ward: 0, perks: setup.perks, weaponDamage: setup.weaponDamage,
    status: "playing", messages: ["Your lantern flickers to life. The deep is waiting."],
    events: [], deepest: 1, bossSlain: false, rage: 0, regen: 0, runId: setup.runId,
    xp: 0, level: 1, gear: [], smashed: 0,
  };
  reveal(state);
  return state;
}

export const levelOf = (s: RunState) => s.level ?? 1;
export const xpOf = (s: RunState) => s.xp ?? 0;
export const propsOf = (floor: Floor): Prop[] => floor.props ?? [];

/** Damage of one blow before a Rage Potion: the weapon, perks, the delver's level and the gear found this descent. */
export const baseDamage = (s: RunState) => s.weaponDamage + s.perks.damage + levelDamage(levelOf(s)) + gearDamage(s.gear);

export function currentRadius(state: RunState) {
  if (state.light <= 0 && state.nightVision > 0) return 2;
  return lightRadius(state.light) + state.perks.radius;
}

export function currentStepCost(state: RunState) {
  return stepCost(state.depth) * (1 - state.perks.stepDiscount);
}

/** The boss keeps the stairs sealed until it is dead. */
export const bossAlive = (s: RunState) => s.floor.dimlings.some(d => d.boss);

export const onStairs = (s: RunState) => s.player.x === s.floor.stairs.x && s.player.y === s.floor.stairs.y;
export const onRift = (s: RunState) => s.player.x === s.floor.spawn.x && s.player.y === s.floor.spawn.y;

function reveal(state: RunState) {
  for (const k of visibleSet(state.floor, state.player, currentRadius(state))) state.floor.seen[k] = 1;
}

function say(state: RunState, text: string) {
  state.messages = [text, ...state.messages].slice(0, 6);
}

function loot(state: RunState, base: number, kind: "gold" | "crystal") {
  const mult = lootMultiplier(state.depth);
  const pct = kind === "gold" ? state.perks.goldPct : state.perks.crystalPct;
  const exponent = kind === "gold" ? 1 : 0.8;
  return Math.max(1, Math.round(base * mult ** exponent * (1 + pct / 100)));
}

function pickup(state: RunState) {
  const at = state.floor.items.findIndex(i => i.x === state.player.x && i.y === state.player.y);
  if (at < 0) return;
  const [item] = state.floor.items.splice(at, 1);
  const rng = state.rng;
  switch (item.kind) {
    case "gold": {
      const g = loot(state, int(rng, 3, 8), "gold");
      state.gold += g; state.events.push("gold"); say(state, `+${g} gold`);
      rollTicket(state);
      break;
    }
    case "crystal": {
      const c = loot(state, int(rng, 1, 3), "crystal");
      state.crystals += c; state.events.push("crystal"); say(state, `+${c} crystals`);
      rollTicket(state);
      break;
    }
    case "oil": {
      state.light += tuning.oilJarLight; noteLight("jars", tuning.oilJarLight);
      state.events.push("oil"); say(state, `+${tuning.oilJarLight} light from a spilled oil jar`);
      break;
    }
    case "chest": {
      const g = loot(state, int(rng, 10, 20), "gold");
      const c = loot(state, int(rng, 2, 5), "crystal");
      state.gold += g; state.crystals += c; state.events.push("chest");
      let text = `Chest: +${g} gold, +${c} crystals, +${CHEST_XP} xp`;
      if (chance(rng, 0.25)) {
        const p = weighted(rng, POTION_DROP_WEIGHTS);
        state.bag[p]++; state.found[p]++; text += `, ${POTIONS[p].name}`;
      }
      say(state, text);
      rollTicket(state);
      gainXp(state, CHEST_XP);
      break;
    }
    case "hoard": {
      const g = loot(state, int(rng, HOARD_GOLD[0], HOARD_GOLD[1]), "gold");
      const c = loot(state, int(rng, HOARD_CRYSTALS[0], HOARD_CRYSTALS[1]), "crystal");
      state.gold += g; state.crystals += c;
      for (const p of ["heal", "rage"] as const) { state.bag[p]++; state.found[p]++; }
      let text = `Cerberus Hoard: +${g} gold, +${c} crystals, a ${POTIONS.heal.name} and a ${POTIONS.rage.name}`;
      if (chance(rng, HOARD_SIGIL_CHANCE)) { state.sigils++; state.events.push("sigil"); text += ", and a Soul Sigil!"; }
      state.events.push("hoard");
      say(state, text);
      rollTicket(state); rollTicket(state); rollTicket(state);
      gainXp(state, HOARD_XP);
      break;
    }
    case "vault": {
      if (chance(rng, SIGIL_DROP_CHANCE)) {
        state.sigils++; state.events.push("sigil");
        say(state, "Sealed Vault: a Soul Sigil! Carry it home to mint a character.");
        rollTicket(state);
      } else {
        const g = loot(state, int(rng, 25, 45), "gold");
        const c = loot(state, int(rng, 5, 10), "crystal");
        state.gold += g; state.crystals += c; state.events.push("vault");
        let text = `Sealed Vault: +${g} gold, +${c} crystals. No sigil this time.`;
        if (chance(rng, 0.3)) { state.bag.heal++; state.found.heal++; text += ` A ${POTIONS.heal.name} was tucked inside.`; }
        say(state, text);
        rollTicket(state);
      }
      gainXp(state, VAULT_XP);
      break;
    }
  }
}

/** Adds experience. Every level reached pours oil into the lantern and, through baseDamage, hardens every blow. */
function gainXp(state: RunState, amount: number) {
  let level = levelOf(state);
  let xp = xpOf(state) + amount;
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    state.light += tuning.levelLight;
    noteLight("levels", tuning.levelLight);
    state.events.push("levelup");
    say(state, `Level ${level}! +${tuning.levelLight} light, +${LEVEL_DAMAGE} damage.`);
  }
  state.level = level;
  state.xp = level >= MAX_LEVEL ? 0 : xp;
}

/** One blow at a prop. When it breaks it gives gold, experience, maybe oil (likelier the lower the lantern) and maybe gear. */
function smash(state: RunState, prop: Prop) {
  const def = propDef(prop.kind);
  const raging = (state.rage ?? 0) > 0;
  let dmg = Math.round(baseDamage(state) * (raging ? RAGE_MULT : 1));
  if (raging) state.rage = (state.rage ?? 0) - 1;
  // A pickaxe splits anything in one blow.
  if ((state.gear ?? []).includes("pickaxe")) dmg = Math.max(dmg, prop.hp);
  prop.hp -= dmg;
  if (prop.hp > 0) {
    state.events.push("smash");
    say(state, `You hit the ${def.name} for ${dmg}; it cracks (${prop.hp}/${prop.maxHp} left)`);
    return;
  }
  state.floor.props = propsOf(state.floor).filter(p => p !== prop);
  state.smashed = (state.smashed ?? 0) + 1;
  state.events.push("break");
  const rng = state.rng;
  const parts: string[] = [];
  const g = loot(state, int(rng, def.gold[0], def.gold[1]), "gold");
  state.gold += g;
  parts.push(`+${g} gold`);
  if (tuning.propOilScale > 0 && chance(rng, oilChance(state.light, state.startLight))) {
    const oil = Math.max(1, Math.round(int(rng, def.oil[0], def.oil[1]) * tuning.propOilScale));
    state.light += oil;
    noteLight("props", oil);
    state.events.push("oil");
    parts.push(`+${oil} light`);
  }
  let xp = int(rng, def.xp[0], def.xp[1]);
  if (def.gear > 0 && chance(rng, def.gear)) {
    const missing = GEAR_IDS.filter(id => !(state.gear ?? []).includes(id));
    if (missing.length) {
      const found = missing[int(rng, 0, missing.length - 1)];
      state.gear = [...(state.gear ?? []), found];
      state.events.push("gear");
      parts.push(`${GEAR[found].name} (${GEAR[found].blurb})`);
    } else {
      xp += GEAR_DUPLICATE_XP;
    }
  }
  parts.push(`+${xp} xp`);
  say(state, `${def.name} breaks: ${parts.join(", ")}`);
  gainXp(state, xp);
}

function rollTicket(state: RunState) {
  if (!chance(state.rng, state.ticketChance)) return;
  state.tickets++;
  state.events.push("ticket");
  say(state, "A raffle ticket was folded into the find. It only counts if you get home.");
}

function burnLight(state: RunState) {
  state.steps++;
  if (state.nightVision > 0 && state.light <= 0) {
    state.nightVision--;
  } else if (!chance(state.rng, state.perks.freeStepChance)) {
    noteLight("steps", Math.min(state.light, currentStepCost(state)));
    state.light = Math.max(0, state.light - currentStepCost(state));
  }
  if (state.perks.regenEvery && state.steps % state.perks.regenEvery === 0) state.light += 1;
  if ((state.regen ?? 0) > 0) { state.light += 1; state.regen = (state.regen ?? 0) - 1; }
}

/** Light a creature's blow takes from a delver who is hit, before armor and perks. */
const hitBase = (state: RunState) => (2 + Math.floor(state.depth / 2)) * ENEMY_HIT_MULT;

function drainLight(state: RunState, amount: number) {
  noteLight("hits", amount);
  if (state.light > 0) state.light = Math.max(0, state.light - amount);
  else if (state.nightVision > 0) state.nightVision = Math.max(0, state.nightVision - Math.ceil(amount));
}

/** The blow lands: whoever is on the marked tiles pays in light, and the creature is left open for a turn. */
function strike(state: RunState, d: Dimling) {
  const name = enemyName(d.species);
  const hit = attackTiles(state.floor, d).some(t => t.x === state.player.x && t.y === state.player.y);
  d.phase = "recovery";
  d.cooldown = ENEMY_RECOVERY;
  d.windupLeft = 0;
  d.aim = null;
  if (!hit) {
    state.events.push("miss");
    say(state, `${name} strikes and hits nothing. It is open for a turn.`);
    return;
  }
  if (state.ward > 0) {
    state.events.push("miss");
    say(state, `Your ward turns aside the ${name}'s blow. It is open for a turn.`);
    return;
  }
  const drain = hitBase(state) * (1 - state.perks.drainReduce);
  drainLight(state, drain);
  state.events.push("drain");
  say(state, `${name} strikes (-${Math.round(drain * 10) / 10} light). It is open for a turn.`);
}

/** A creature's turn: recover, finish a wind-up, start one when the delver is in reach, or close in. */
function creatureAct(state: RunState, d: Dimling, visible: Set<number>, nearest: (cells: Point[]) => number, moveChance: number) {
  const { floor, player, rng } = state;
  const def = enemyDef(d.species);
  if (d.phase === "recovery") {
    d.cooldown = (d.cooldown ?? 1) - 1;
    if (d.cooldown <= 0) { d.phase = "idle"; d.cooldown = 0; }
    return;
  }
  if (d.phase === "windup") {
    if ((d.windupLeft ?? 1) > 1) {
      d.windupLeft = (d.windupLeft ?? 1) - 1;
      say(state, `${def.name} is still winding up. Step off the marked tiles.`);
    } else strike(state, d);
    return;
  }
  // It only attacks what it can be seen attacking, so the warning is always visible.
  const dir = reachDirection(floor, d, player);
  if (dir && visible.has(idx(floor, d.x, d.y))) {
    d.phase = "windup";
    d.windupLeft = def.windup;
    d.aim = def.attack === "line" ? dir : null;
    state.events.push("warn");
    say(state, `${def.name} winds up. Step off the marked tiles${def.windup > 1 ? ` (${def.windup} turns)` : " (next move)"}.`);
    return;
  }
  if (def.move <= 0 || !chance(rng, Math.min(0.95, moveChance * def.move))) return;
  const here = nearest(footprint(d));
  const options = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
    .map(step => ({ x: d.x + step.x, y: d.y + step.y }))
    .filter(p => isFloor(floor, p.x, p.y)
      && !(p.x === player.x && p.y === player.y)
      && !propsOf(floor).some(pr => pr.x === p.x && pr.y === p.y)
      && !floor.dimlings.some(o => o !== d && footprint(o).some(oc => oc.x === p.x && oc.y === p.y))
      && nearest([p]) < here)
    .sort((a, b) => nearest([a]) - nearest([b]));
  if (options.length) { d.x = options[0].x; d.y = options[0].y; }
}

function dimlingsAct(state: RunState) {
  const { floor, player, rng } = state;
  const moveChance = Math.min(0.9, 0.55 + 0.05 * state.depth);
  const notice = state.perks.stealth ? 1 : currentRadius(state) + 2;
  const path = distances(floor, player);
  const nearest = (cells: Point[]) => Math.min(...cells.map(c => path[idx(floor, c.x, c.y)]).filter(v => v >= 0));
  const visible = visibleSet(floor, player, currentRadius(state));
  for (const d of floor.dimlings) {
    const dist = dimlingDistance(d, player);
    if (!d.awake && dist <= notice) d.awake = true;
    if (!d.awake) continue;
    if (!d.boss) { creatureAct(state, d, visible, nearest, moveChance); continue; }
    // Cerberus does not wind up: it drinks light every turn the delver touches it, and it moves at half a creature's pace.
    if (dist === 1) {
      if (state.ward > 0) continue;
      const drain = BOSS_DRAIN * (1 - state.perks.drainReduce);
      drainLight(state, drain);
      state.events.push("drain");
      say(state, `Cerberus drinks your light (-${Math.round(drain * 10) / 10})`);
      continue;
    }
    if (!chance(rng, moveChance * BOSS_MOVE_FACTOR)) continue;
    const here = nearest(footprint(d));
    const options = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
      .map(step => ({ x: d.x + step.x, y: d.y + step.y }))
      .map(p => ({ p, cells: footprint({ x: p.x, y: p.y, size: d.size }) }))
      .filter(({ cells }) => cells.every(c => isFloor(floor, c.x, c.y))
        && !cells.some(c => c.x === player.x && c.y === player.y)
        && !cells.some(c => propsOf(floor).some(pr => pr.x === c.x && pr.y === c.y))
        && !floor.dimlings.some(o => o !== d && footprint(o).some(oc => cells.some(c => c.x === oc.x && c.y === oc.y)))
        && nearest(cells) < here)
      .sort((a, b) => nearest(a.cells) - nearest(b.cells));
    if (options.length) { d.x = options[0].p.x; d.y = options[0].p.y; }
  }
}

function checkDarkness(state: RunState) {
  if (state.light > 0 || state.nightVision > 0) return;
  if (state.bag.nightVision > 0) {
    state.bag.nightVision--; state.used.nightVision++;
    state.nightVision = NIGHT_VISION_STEPS;
    state.events.push("nightVision");
    say(state, `Your light died. Night Vision kicks in: ${NIGHT_VISION_STEPS} steps to find a rift.`);
    return;
  }
  state.status = "dead";
  state.events.push("dark");
  say(state, "Darkness swallows you. You wake up at camp, empty-handed.");
}

function slayBoss(state: RunState, boss: Dimling) {
  state.floor.dimlings = state.floor.dimlings.filter(d => d !== boss);
  // The reward is a chest left where Cerberus stood; the delver has to walk over and open it.
  const id = Math.max(0, ...state.floor.items.map(i => i.id), ...state.floor.dimlings.map(d => d.id), boss.id) + 1;
  state.floor.items.push({ id, x: boss.x, y: boss.y, kind: "hoard" });
  state.kills++;
  state.bossSlain = true;
  if (state.perks.lightOnKill) state.light += state.perks.lightOnKill;
  state.events.push("boss");
  say(state, "Cerberus falls. A hoard chest lies where it stood, and the stairs are open.");
  gainXp(state, BOSS_XP);
}

function endTurn(state: RunState) {
  burnLight(state);
  dimlingsAct(state);
  if (state.ward > 0) state.ward--;
  checkDarkness(state);
  reveal(state);
}

export function applyAction(prev: RunState, action: RunAction): RunState {
  if (prev.status !== "playing") return prev;
  const state = structuredClone(prev);
  state.events = [];

  switch (action.type) {
    case "move": {
      const { dx, dy } = action;
      if (dx < 0) state.player.facing = "left";
      else if (dx > 0) state.player.facing = "right";
      else if (dy < 0) state.player.facing = "up";
      else if (dy > 0) state.player.facing = "down";
      const tx = state.player.x + dx, ty = state.player.y + dy;
      const target = state.floor.dimlings.find(d => footprint(d).some(c => c.x === tx && c.y === ty));
      if (target) {
        const raging = (state.rage ?? 0) > 0;
        const dmg = Math.round(baseDamage(state) * (raging ? RAGE_MULT : 1));
        if (raging) state.rage = (state.rage ?? 0) - 1;
        target.hp -= dmg;
        if (target.hp <= 0 && target.boss) {
          slayBoss(state, target);
        } else if (target.hp <= 0) {
          state.floor.dimlings = state.floor.dimlings.filter(d => d !== target);
          const g = loot(state, int(state.rng, KILL_GOLD[0], KILL_GOLD[1]), "gold");
          state.gold += g; state.kills++;
          if (state.perks.lightOnKill) state.light += state.perks.lightOnKill;
          state.events.push("kill");
          const xp = killXp(state.depth);
          // A defeated creature may drop oil, likelier the lower the lantern is, like a prop does.
          let dropped = 0;
          const [dropFull, dropEmpty] = tuning.killDropChance;
          if (dropFull > 0 || dropEmpty > 0) {
            const p = dropFull + (dropEmpty - dropFull) * (1 - lanternFullness(state.light, state.startLight));
            if (chance(state.rng, p)) {
              dropped = int(state.rng, tuning.killDropLight[0], tuning.killDropLight[1]);
              state.light += dropped;
              noteLight("kills", dropped);
              state.events.push("oil");
            }
          }
          const extraLight = (state.perks.lightOnKill ? state.perks.lightOnKill : 0) + dropped;
          say(state, `${enemyName(target.species)} defeated: +${g} gold, +${xp} xp${extraLight ? `, +${extraLight} light` : ""}`);
          rollTicket(state);
          gainXp(state, xp);
        } else {
          state.events.push("hit");
          say(state, `You hit ${target.boss ? "Cerberus" : enemyName(target.species)} for ${dmg} (${target.hp}/${target.maxHp} left)`);
        }
        endTurn(state);
        break;
      }
      const prop = propsOf(state.floor).find(pr => pr.x === tx && pr.y === ty);
      if (prop) {
        smash(state, prop);
        endTurn(state);
        break;
      }
      if (!isFloor(state.floor, tx, ty)) {
        state.events.push("bump");
        return { ...prev, player: { ...prev.player, facing: state.player.facing }, events: ["bump"] };
      }
      state.player.x = tx; state.player.y = ty;
      state.events.push("step");
      pickup(state);
      endTurn(state);
      if (state.status === "playing" && onStairs(state)) say(state, "Stairs down. Press E to descend deeper.");
      else if (state.status === "playing" && onRift(state)) say(state, "A rift home. Press E to extract with your loot.");
      break;
    }
    case "wait":
      say(state, "You hold still and listen.");
      endTurn(state);
      break;
    case "potion": {
      const id = action.id;
      if (state.bag[id] <= 0) return prev;
      if (id === "nightVision") {
        if (state.nightVision > 0) return prev;
        state.nightVision = NIGHT_VISION_STEPS;
      } else if (id === "oil") {
        state.light += 30;
      } else if (id === "flare") {
        state.floor.seen = state.floor.seen.map(() => 1);
        state.floor.revealed = true;
      } else if (id === "ward") {
        state.ward = WARD_STEPS;
      } else if (id === "rage") {
        if ((state.rage ?? 0) > 0) return prev;
        state.rage = RAGE_HITS;
      } else if (id === "regen") {
        if ((state.regen ?? 0) > 0) return prev;
        state.regen = REGEN_TURNS;
      } else if (id === "heal") {
        state.light += HEAL_LIGHT;
      }
      state.bag[id]--; state.used[id]++;
      state.events.push("potion");
      say(state, `${POTIONS[id].name} used.`);
      reveal(state);
      break;
    }
    case "descend": {
      if (!onStairs(state)) return prev;
      if (bossAlive(state)) {
        say(state, "The stairs are sealed. Cerberus must fall first.");
        return { ...prev, messages: state.messages, events: ["sealed"] };
      }
      state.depth++;
      state.deepest = Math.max(state.deepest, state.depth);
      state.floor = generateFloor(state.rng, state.depth, { findPct: state.perks.findPct });
      state.player = { ...state.floor.spawn, facing: state.player.facing };
      state.events.push("descend");
      say(state, `Depth ${state.depth}. Loot x${lootMultiplier(state.depth).toFixed(1)}, each step burns ${currentStepCost(state).toFixed(2)} light.`);
      reveal(state);
      break;
    }
    case "extract": {
      if (!onRift(state)) return prev;
      state.status = "extracted";
      state.events.push("extract");
      say(state, "You step through the rift and back to camp.");
      break;
    }
  }
  return state;
}

export function isVisible(state: RunState, x: number, y: number, visible: Set<number>) {
  return state.floor.revealed ? state.floor.seen[idx(state.floor, x, y)] === 1 : visible.has(idx(state.floor, x, y));
}
