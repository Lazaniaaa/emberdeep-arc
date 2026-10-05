import { CLASSES, RARITY_INFO, heroPerkText, type HeroNft } from "@/game/catalog";
import { heroMask, type Mask } from "@/render/sprites";
import type { Portrait } from "./art";
import type { HeroChoice } from "@/state/store";

export type HeroVisual = {
  name: string;
  subtitle: string;
  perk: string;
  color: string;
  /** Delver masks face one way and are mirrored for the other. */
  mirrored: boolean;
  /** The picture shown on cards. */
  portrait?: Portrait;
  mask: (facing: "left" | "right" | "up" | "down", walking?: boolean, frame?: number) => Mask;
};

export const WANDERER: HeroVisual = {
  name: "Wanderer",
  subtitle: "Free starter",
  perk: "No perk. Mint a character for a real edge.",
  color: "#d4d4d4",
  mirrored: true,
  portrait: { kind: "wanderer", rarity: "common" },
  mask: (_f, walking = false, frame = 0) => heroMask("wanderer", walking ? frame : 0),
};

/** `k` is the strength of the Delver's perk: a held Delver by default, more if it is locked. */
export function nftVisual(hero: HeroNft, k?: number): HeroVisual {
  const info = RARITY_INFO[hero.rarity];
  return {
    name: `${CLASSES[hero.classId].name} #${hero.serial}`,
    subtitle: `${info.label}${hero.source === "sigil" ? " · Soul Sigil" : hero.source === "draw" ? " · Weekly draw" : ""}`,
    perk: heroPerkText(hero, k),
    color: info.color,
    mirrored: true,
    portrait: { kind: hero.classId, rarity: hero.rarity, edition: hero.edition },
    mask: (_f, walking = false, frame = 0) => heroMask(hero.classId, walking ? frame : 0),
  };
}

export function resolveHero(choice: HeroChoice, heroes: HeroNft[]): HeroVisual {
  if (choice.kind === "nft") {
    const hero = heroes.find(h => h.id === choice.id);
    if (hero) return nftVisual(hero);
  }
  return WANDERER;
}
