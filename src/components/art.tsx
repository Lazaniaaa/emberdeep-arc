import { useMemo } from "react";
import { RARITY_INFO, type ClassId, type Rarity } from "@/game/catalog";
import { RARITY_SUPPLY } from "@/game/config";
import { cn } from "@/lib/utils";
import { ITEM_ART, portraitArt, type ItemArtId } from "@/render/item-art";
import { spriteToDataUrl } from "@/render/pixel-art";

/** A weapon, armor or potion icon. */
export function ItemArt({ id, px = 3, className }: { id: ItemArtId; px?: number; className?: string }) {
  const src = useMemo(() => spriteToDataUrl(ITEM_ART[id], px), [id, px]);
  return <img src={src} alt="" aria-hidden className={cn("pixelated shrink-0", className)} draggable={false} />;
}

export type Portrait = { kind: ClassId | "wanderer"; rarity: Rarity; edition?: number };

/** The picture of a Delver: a bust in front of a rarity-colored backdrop, with its edition number. */
export function HeroAvatar({ portrait, px = 5, className, showEdition = true }: {
  portrait: Portrait; px?: number; className?: string; showEdition?: boolean;
}) {
  const { kind, rarity, edition } = portrait;
  const info = RARITY_INFO[rarity];
  const src = useMemo(() => spriteToDataUrl(portraitArt(kind, rarity), px), [kind, rarity, px]);
  const legendary = rarity === "legendary";
  return (
    <div
      className={cn("relative inline-block overflow-hidden rounded-lg", className)}
      style={{
        border: `2px solid ${info.color}`,
        background: `radial-gradient(circle at 50% 35%, ${info.color}55, #150c2b 75%)`,
        boxShadow: legendary ? `0 0 14px ${info.color}88` : undefined,
      }}
    >
      <img src={src} alt="" aria-hidden className="pixelated block" draggable={false} />
      {showEdition && edition !== undefined && (
        <span className="absolute right-0 bottom-0 left-0 bg-black/70 py-0.5 text-center font-pixel text-[8px]" style={{ color: info.color }}>
          #{edition}/{RARITY_SUPPLY[rarity]}
        </span>
      )}
    </div>
  );
}
