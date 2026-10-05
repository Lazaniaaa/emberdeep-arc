import { Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hallConfig } from "@/chain/arc-config";
import { ACTIVE_SHARE, FLASK_PRICE, KEY_PRICE, LOCK_MAX, LOCK_SHARE, MATURITY_ROUNDS, MAX_ROUND_RETURN, REVENUE_SHARE } from "@/game/config";
import { roundShare } from "@/game/economy";
import { percent, usd } from "@/lib/format";
import { useHall } from "@/state/hall";
import { useGame } from "@/state/store";

const STEPS = [
  {
    title: "Get in",
    text: `Buy an entry key (${usd(KEY_PRICE)}) and lantern oil (${usd(FLASK_PRICE)} a flask) at the Dungeon Gate. More oil means more light, and light is how far you can see and how far you can walk.`,
  },
  {
    title: "Go down",
    text: "Every step burns light. Collect gold and crystals, fight dimlings with your weapon, and take the stairs for richer floors. On floor 7 Cerberus, a three-headed hound, guards the way and leaves a hoard chest when it falls.",
  },
  {
    title: "Come home",
    text: "Walk back to the rift you arrived through to extract. If your light dies first, everything you carried is lost.",
  },
  {
    title: "Share the pool",
    text: `Gold you bring home counts toward the round. When it closes, you take the same percentage of the pool as your percentage of the gold, up to ${Math.round(MAX_ROUND_RETURN * 100)}% of what you put into descents that round. ${Math.round(ACTIVE_SHARE * 100)}% of every dollar spent feeds the pool, ${Math.round(LOCK_SHARE * 100)}% the lock pool and ${Math.round(REVENUE_SHARE * 100)}% is the studio's revenue.`,
  },
  {
    title: "Lock to grow",
    text: `Perks you only hold work at reduced strength. Lock a Delver or a stake at the Ember Altar and its perk grows with every round closed, up to ${Math.round(LOCK_MAX * 100)}%. Locks also farm a share of the lock pool, paid once they mature after ${MATURITY_ROUNDS} rounds. Everything here is simulated.`,
  },
];

export function GuidePanel({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="space-y-4">
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-lime font-pixel text-xs text-[#150c2b]">{i + 1}</span>
              <span className="font-pixel text-sm">{step.title}</span>
            </div>
            <p className="text-sm text-foreground/80">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Everything economic here is simulated USDC kept in this browser. The only thing written on chain is a descent you choose to record in the Hall of Descents on Arc.
        The other delvers you see in camp are simulated too: they are ambience, not other players.
      </p>
      <Button className="font-pixel" onClick={onPlay}><Flame data-icon="inline-start" /> Go to the gate</Button>
    </div>
  );
}

export function HallPanel() {
  const g = useGame();
  const share = roundShare(g.roundGold, g.fieldGold);
  const rows: [string, string][] = [
    ["Descents", `${g.stats.runs}`],
    ["Made it home", `${g.stats.extracts}`],
    ["Lost in the dark", `${g.stats.deaths}`],
    ["Deepest floor", g.stats.deepest ? `${g.stats.deepest}` : "-"],
    ["Bosses slain", `${g.stats.bosses}`],
    ["Best round claim", g.stats.bestPayout ? usd(g.stats.bestPayout) : "-"],
    ["Delvers minted", `${g.stats.mints}`],
    ["Expeditions completed", `${g.stats.expeditions}`],
    ["Delvers won in the draw", `${g.heroes.filter(h => h.source === "draw").length}`],
    ["Paid to the studio", usd(g.revenue)],
    ["This round", g.roundGold > 0 ? `${g.roundGold} gold · ${percent(share)} of the gold` : "no gold banked yet"],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <dt className="text-xs tracking-wider text-muted-foreground uppercase">{label}</dt>
            <dd className="font-pixel text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">These numbers are saved only in this browser.{hallConfig() && " The public leaderboard is the Hall of Descents on Arc."}</p>
      {hallConfig() && (
        <Button variant="secondary" size="sm" onClick={() => useHall.getState().setOpen(true)}>
          <Trophy data-icon="inline-start" /> Open the Hall of Descents
        </Button>
      )}
    </div>
  );
}
