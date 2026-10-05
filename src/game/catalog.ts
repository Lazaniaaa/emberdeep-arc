import { HOLD_FACTOR, HP_SCALE } from "./config";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITIES: readonly Rarity[] = ["common", "rare", "epic", "legendary"];

export const RARITY_INFO: Record<Rarity, { label: string; price: number; color: string; tier: number }> = {
  common: { label: "Common", price: 100, color: "#d4d4d4", tier: 0 },
  rare: { label: "Rare", price: 250, color: "#5cc8ff", tier: 1 },
  epic: { label: "Epic", price: 600, color: "#c77dff", tier: 2 },
  legendary: { label: "Legendary", price: 1_500, color: "#ffb800", tier: 3 },
};

export type Perks = {
  goldPct: number;
  crystalPct: number;
  startLight: number;
  stepDiscount: number;
  damage: number;
  findPct: number;
  radius: number;
  drainReduce: number;
  regenEvery: number;
  freeStepChance: number;
  stealth: boolean;
  lightOnKill: number;
};

export const NO_PERKS: Perks = {
  goldPct: 0, crystalPct: 0, startLight: 0, stepDiscount: 0, damage: 0, findPct: 0,
  radius: 0, drainReduce: 0, regenEvery: 0, freeStepChance: 0, stealth: false, lightOnKill: 0,
};

/** A step discount acts like extra light, and extra light multiplies the gold banked. Stacking is capped. */
export const MAX_STEP_DISCOUNT = 0.4;

export function mergePerks(...list: Partial<Perks>[]): Perks {
  const out: Perks = { ...NO_PERKS };
  for (const p of list) {
    out.goldPct += p.goldPct ?? 0;
    out.crystalPct += p.crystalPct ?? 0;
    out.startLight += p.startLight ?? 0;
    out.stepDiscount = Math.min(MAX_STEP_DISCOUNT, out.stepDiscount + (p.stepDiscount ?? 0));
    out.damage += p.damage ?? 0;
    out.findPct += p.findPct ?? 0;
    out.radius += p.radius ?? 0;
    out.drainReduce = Math.min(0.8, out.drainReduce + (p.drainReduce ?? 0));
    if (p.regenEvery) out.regenEvery = out.regenEvery ? Math.min(out.regenEvery, p.regenEvery) : p.regenEvery;
    out.freeStepChance = Math.min(0.5, out.freeStepChance + (p.freeStepChance ?? 0));
    out.stealth = out.stealth || !!p.stealth;
    out.lightOnKill += p.lightOnKill ?? 0;
  }
  return out;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Scales a perk by a strength factor: HOLD_FACTOR for a perk you only hold, more for one you lock.
 * Counts round to whole numbers, light radius rounds down (a fraction of a tile is no tile), and a
 * regrowth interval gets shorter as the perk gets stronger. Stealth is on or off, so it is not scaled.
 */
export function scalePerks(p: Partial<Perks>, k: number): Partial<Perks> {
  const out: Partial<Perks> = {};
  if (p.goldPct) out.goldPct = Math.round(p.goldPct * k);
  if (p.crystalPct) out.crystalPct = Math.round(p.crystalPct * k);
  if (p.findPct) out.findPct = Math.round(p.findPct * k);
  if (p.startLight) out.startLight = Math.round(p.startLight * k);
  if (p.damage) out.damage = Math.round(p.damage * k);
  if (p.stepDiscount) out.stepDiscount = cents(p.stepDiscount * k);
  if (p.drainReduce) out.drainReduce = cents(p.drainReduce * k);
  if (p.freeStepChance) out.freeStepChance = cents(p.freeStepChance * k);
  if (p.radius) out.radius = Math.floor(p.radius * k + 1e-9);
  if (p.regenEvery) out.regenEvery = Math.max(1, Math.round(p.regenEvery / k));
  if (p.lightOnKill) out.lightOnKill = p.lightOnKill;
  if (p.stealth) out.stealth = true;
  return out;
}

/** The effect of a set of perks in plain words. */
export function describePerks(p: Partial<Perks>): string {
  const out: string[] = [];
  if (p.goldPct) out.push(`+${p.goldPct}% gold`);
  if (p.crystalPct) out.push(`+${p.crystalPct}% crystals`);
  if (p.startLight) out.push(`+${p.startLight} starting light`);
  if (p.stepDiscount) out.push(`-${Math.round(p.stepDiscount * 100)}% light per step`);
  if (p.damage) out.push(`+${p.damage} weapon damage`);
  if (p.findPct) out.push(`+${p.findPct}% chests and vaults`);
  if (p.radius) out.push(`+${p.radius} light radius`);
  if (p.drainReduce) out.push(`dimlings drain ${Math.round(p.drainReduce * 100)}% less`);
  if (p.regenEvery) out.push(`+1 light every ${p.regenEvery} steps`);
  if (p.freeStepChance) out.push(`${Math.round(p.freeStepChance * 100)}% of steps are free`);
  if (p.stealth) out.push("dimlings wake only up close");
  return out.length > 0 ? out.join(", ") : "no effect yet";
}

export type ClassId = "prospector" | "seer" | "lamplighter" | "pathfinder" | "duelist" | "scavenger";

type ClassDef = {
  id: ClassId;
  name: string;
  blurb: string;
  perk: (tier: number) => Partial<Perks>;
  describe: (tier: number) => string;
};

const scale = <T,>(values: readonly T[]) => (tier: number) => values[tier];

const gold = scale([15, 25, 40, 60]);
const crystals = scale([15, 25, 40, 60]);
const light = scale([10, 20, 35, 50]);
const discount = scale([0.1, 0.15, 0.25, 0.35]);
const damage = scale([1 * HP_SCALE, 1 * HP_SCALE, 2 * HP_SCALE, 3 * HP_SCALE]);
const find = scale([10, 20, 30, 45]);

export const CLASSES: Record<ClassId, ClassDef> = {
  prospector: {
    id: "prospector", name: "Prospector", blurb: "Smells gold through stone.",
    perk: t => ({ goldPct: gold(t) }), describe: t => `+${gold(t)}% gold`,
  },
  seer: {
    id: "seer", name: "Crystal Seer", blurb: "Hears crystals hum in the dark.",
    perk: t => ({ crystalPct: crystals(t) }), describe: t => `+${crystals(t)}% crystals`,
  },
  lamplighter: {
    id: "lamplighter", name: "Lamplighter", blurb: "Never enters the deep without spare oil.",
    perk: t => ({ startLight: light(t) }), describe: t => `+${light(t)} starting light`,
  },
  pathfinder: {
    id: "pathfinder", name: "Pathfinder", blurb: "Walks softly, burns slowly.",
    perk: t => ({ stepDiscount: discount(t) }), describe: t => `-${Math.round(discount(t) * 100)}% light per step`,
  },
  duelist: {
    id: "duelist", name: "Duelist", blurb: "Dimlings learn to keep their distance.",
    perk: t => ({ damage: damage(t) }), describe: t => `+${damage(t)} weapon damage`,
  },
  scavenger: {
    id: "scavenger", name: "Scavenger", blurb: "Finds chests other delvers walk past.",
    perk: t => ({ findPct: find(t) }), describe: t => `+${find(t)}% chests and vaults`,
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export const LEGENDARY_BONUS: Partial<Perks> = { radius: 1 };

export type HeroNft = {
  id: string;
  serial: number;
  classId: ClassId;
  rarity: Rarity;
  /** Minted at the Ember Altar, from a Soul Sigil found in the deep, or won in the weekly draw. */
  source: "altar" | "sigil" | "draw";
  mintedAt: number;
  /** Edition within its rarity, out of RARITY_SUPPLY. Delvers minted before supply caps omit it. */
  edition?: number;
};

export function heroPerks(hero: HeroNft): Partial<Perks> {
  const tier = RARITY_INFO[hero.rarity].tier;
  const base = CLASSES[hero.classId].perk(tier);
  return hero.rarity === "legendary" ? mergePerks(base, LEGENDARY_BONUS) : base;
}

/** What a Delver's perk does at strength `k`. The default is a Delver you only hold. */
export function heroPerkText(hero: HeroNft, k = HOLD_FACTOR) {
  return describePerks(scalePerks(heroPerks(hero), k));
}

/** What a class does at strength `k` for a given rarity tier, for the mint cards. */
export function classPerkText(classId: ClassId, tier: number, k = HOLD_FACTOR) {
  return describePerks(scalePerks(CLASSES[classId].perk(tier), k));
}

export type WeaponId = "fists" | "dagger" | "sword" | "emberblade";

export const WEAPONS: Record<WeaponId, { id: WeaponId; name: string; damage: number; price: number; crystals: number; lightOnKill: number; blurb: string }> = {
  fists: { id: "fists", name: "Bare hands", damage: 1 * HP_SCALE, price: 0, crystals: 0, lightOnKill: 0, blurb: "Better than nothing. Barely." },
  dagger: { id: "dagger", name: "Rusty Dagger", damage: 2 * HP_SCALE, price: 60, crystals: 0, lightOnKill: 0, blurb: "Quick, cheap, reliable." },
  sword: { id: "sword", name: "Iron Sword", damage: 3 * HP_SCALE, price: 150, crystals: 20, lightOnKill: 0, blurb: "Two swings for most dimlings." },
  emberblade: { id: "emberblade", name: "Emberblade", damage: 5 * HP_SCALE, price: 400, crystals: 60, lightOnKill: 4, blurb: "Drinks a dimling's glow: +4 light per kill." },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

export type PotionId = "nightVision" | "oil" | "flare" | "ward" | "rage" | "regen" | "heal";

export type PotionDef = {
  id: PotionId; name: string; price: number; crystals: number; key: string; blurb: string;
  /** False for potions that only drop in the deep and can never be bought or crafted. */
  shop: boolean;
};

export const POTIONS: Record<PotionId, PotionDef> = {
  nightVision: { id: "nightVision", name: "Night Vision", price: 30, crystals: 12, key: "1", shop: true, blurb: "Triggers when your light dies: 25 more steps in the dark." },
  oil: { id: "oil", name: "Oil Vial", price: 15, crystals: 6, key: "2", shop: true, blurb: "+30 light, right now." },
  flare: { id: "flare", name: "Flare", price: 25, crystals: 10, key: "3", shop: true, blurb: "Reveals the whole floor, stairs included." },
  ward: { id: "ward", name: "Ward Charm", price: 25, crystals: 10, key: "4", shop: true, blurb: "Dimlings can't drain you for 15 steps." },
  rage: { id: "rage", name: "Rage Potion", price: 40, crystals: 16, key: "5", shop: true, blurb: "+80% damage on your next 5 blows." },
  regen: { id: "regen", name: "Regeneration", price: 10, crystals: 4, key: "6", shop: true, blurb: "+1 light on each of the next 5 turns." },
  heal: { id: "heal", name: "Healing Draught", price: 0, crystals: 0, key: "7", shop: false, blurb: "+60 light, at once. Never sold: it only turns up in chests, vaults and the Cerberus Hoard." },
};

export const POTION_IDS = Object.keys(POTIONS) as PotionId[];
/** Potions the Armory sells. */
export const SHOP_POTION_IDS = POTION_IDS.filter(id => POTIONS[id].shop);

/** Relative odds of each potion when a chest holds one. */
export const POTION_DROP_WEIGHTS: Record<PotionId, number> = {
  nightVision: 3, oil: 3, flare: 2, ward: 3, rage: 2, regen: 3, heal: 2,
};

export type ArmorId = "none" | "leather" | "chain" | "emberplate";

export type ArmorDef = { id: ArmorId; name: string; drainReduce: number; price: number; crystals: number; blurb: string };

/** Armor thins the light dimlings drink from you. It stacks with class perks up to the shared cap. */
export const ARMORS: Record<ArmorId, ArmorDef> = {
  none: { id: "none", name: "No armor", drainReduce: 0, price: 0, crystals: 0, blurb: "Every dimling drinks its fill." },
  leather: { id: "leather", name: "Leather Vest", drainReduce: 0.15, price: 80, crystals: 10, blurb: "Dimlings drain 15% less." },
  chain: { id: "chain", name: "Chain Mail", drainReduce: 0.3, price: 220, crystals: 30, blurb: "Dimlings drain 30% less." },
  emberplate: { id: "emberplate", name: "Emberplate", drainReduce: 0.45, price: 520, crystals: 70, blurb: "Dimlings drain 45% less. Warm to the touch." },
};

export const ARMOR_IDS = Object.keys(ARMORS) as ArmorId[];

