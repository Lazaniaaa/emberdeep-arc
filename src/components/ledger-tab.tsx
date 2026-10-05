import { Coins, RotateCcw, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVE_SHARE, DRAW_MINTS, EXPEDITION_POOL, EXPEDITION_REVENUE, FAUCET_AMOUNT, FIELD_WEEK_SPEND, KEY_PRICE, LOCK_SHARE, MAX_ROUND_RETURN,
  POOL_SHARE, REVENUE_SHARE,
} from "@/game/config";
import { roundShare } from "@/game/economy";
import { percent, usd } from "@/lib/format";
import { useGame } from "@/state/store";

/** Gold is a count, not money. */
const num = (n: number) => Math.round(n).toLocaleString("en-US");

export function LedgerTab() {
  const g = useGame();
  const rtp = g.spent > 0 ? g.returned / g.spent : null;
  const share = roundShare(g.roundGold, g.fieldGold);

  const claim = () => {
    const result = g.claimRound();
    if (!result) {
      toast.error("Bring gold home first, or lock something. Only gold from runs you extract alive counts.");
      return;
    }
    const gold = g.roundGold > 0 ? `You held ${percent(result.share)} of the gold and took ${usd(result.payout)} from the pool. ` : "";
    const farmed = result.farmed > 0 ? `Your locks farmed ${usd(result.farmed)}. ` : "";
    const capped = result.withheld > 0 ? `The return cap held back ${usd(result.withheld)}; it stays in the pool.` : "";
    toast.success(`Round ${result.round} closed. ${gold}${farmed}${capped}`.trim());
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card className="ring-gold/30 lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-pixel text-gold">Reward round {g.round}</CardTitle>
          <CardDescription>
            {Math.round(ACTIVE_SHARE * 100)}% of every dollar spent goes into the round's pool. Gold is found only by playing, and only gold you carry out alive counts.
            When the round closes the pool is shared by gold: hold 1% of all the gold and you take 1% of the pool, up to {Math.round(MAX_ROUND_RETURN * 100)}% of what you put into descents that round (keys and oil). Whatever the cap holds back stays in the pool for the next round. There is no fixed rate per gold, so what you receive depends on what everyone else brings home.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Round pool" value={usd(g.pool)} sub="Simulated USDC" accent="text-gold" />
            <Metric label="Your gold" value={num(g.roundGold)} sub="Banked this round" accent="text-gold" />
            <Metric label="Everyone else" value={num(g.fieldGold)} sub="Simulated delvers' gold" />
            <Metric label="Your share" value={g.roundGold > 0 ? percent(share) : "0%"} sub="Of the pool, if the round closed now" accent="text-lime" />
            <Metric label="Lock pool" value={usd(g.locked)} sub={`${g.locks.length} lock${g.locks.length === 1 ? "" : "s"} of yours · Altar`} accent="text-crystal" />
          </div>
          <p className="text-xs text-muted-foreground">
            {g.roundSpent > 0
              ? <>Return cap this round: up to <b className="text-foreground">{usd(g.roundSpent * MAX_ROUND_RETURN)}</b> ({Math.round(MAX_ROUND_RETURN * 100)}% of the {usd(g.roundSpent)} you put into descents).</>
              : <>Return cap: you take back at most {Math.round(MAX_ROUND_RETURN * 100)}% of what you put into descents this round. Nothing put in yet.</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={claim} disabled={g.roundGold <= 0 && g.locks.length === 0}>
              <Trophy data-icon="inline-start" /> Close round and claim
            </Button>
            <Button variant="outline" onClick={() => { g.addFieldWeek(); toast(`Simulated delvers spent ${usd(FIELD_WEEK_SPEND)} and banked their gold.`); }}>
              <Users data-icon="inline-start" /> Add a simulated crowd
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            In production the round would close on a schedule. Here the buttons let you see a whole round resolve. Each new round opens with a simulated crowd already in it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Where every dollar goes</CardTitle>
          <CardDescription>One rule for keys, oil, potions, weapons, passes and mints. No token, no emissions: rewards only ever come from what players already spent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${ACTIVE_SHARE * 100}% reward pool, ${LOCK_SHARE * 100}% lock pool, ${REVENUE_SHARE * 100}% studio revenue`}>
            <div className="bg-gold" style={{ width: `${ACTIVE_SHARE * 100}%` }} />
            <div className="bg-crystal" style={{ width: `${LOCK_SHARE * 100}%` }} />
            <div className="bg-white/30" style={{ width: `${REVENUE_SHARE * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-gold">{Math.round(ACTIVE_SHARE * 100)}% reward pool</span>
            <span className="text-crystal">{Math.round(LOCK_SHARE * 100)}% lock pool</span>
            <span className="text-muted-foreground">{Math.round(REVENUE_SHARE * 100)}% studio revenue</span>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            <li>A descent needs an entry key ({usd(KEY_PRICE)}) plus lantern oil. Both go through this split.</li>
            <li>Gold you <b>extract</b> joins the round. When it closes you receive your percentage of all gold as your percentage of the pool.</li>
            <li>Die in the dark and your gold counts for nobody. The pool is then shared among the delvers who made it home.</li>
            <li>Each week {DRAW_MINTS} Delvers are minted free for the winning draw tickets. Tickets come only from descents you extract from (and a little from expeditions and locks), so spending without playing wins nothing.</li>
            <li>The lock pool ({Math.round(LOCK_SHARE * 100)}%, part of the {Math.round(POOL_SHARE * 100)}% that goes back to players) is shared only among locked Delvers and stakes, by passive gold. Descents never draw on it, and locks never draw on the round pool.</li>
            <li>Expeditions (Ember Altar) use their own split: {Math.round(EXPEDITION_POOL * 100)}% into the round pool, {Math.round(EXPEDITION_REVENUE * 100)}% to the studio. Their hauls are keys, tickets and gold, never money.</li>
            <li>The studio's revenue pays for the game: development, the server, and the gas of the Hall of Descents on Arc.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Your session</CardTitle>
          <CardDescription>Everything here is simulated USDC, saved only in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="You spent" value={usd(g.spent)} />
            <Metric label="Claimed from pools" value={usd(g.returned)} sub={rtp === null ? "No spend yet" : `${Math.round(rtp * 100)}% of spend`} accent="text-gold" />
            <Metric label="Paid to the studio" value={usd(g.revenue)} sub={`${Math.round(REVENUE_SHARE * 100)}% of spend`} />
            <Metric label="Entry keys" value={`${g.keys}`} sub={`${usd(KEY_PRICE)} each`} accent="text-gold" />
            <Metric label="Draw tickets" value={`${g.tickets}`} sub={`${DRAW_MINTS} free mints this week`} accent="text-sigil" />
            <Metric label="Runs" value={`${g.stats.extracts}/${g.stats.runs} extracted`} sub={`Deepest: ${g.stats.deepest || "-"} · Bosses slain: ${g.stats.bosses}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { g.faucet(); toast.success(`+${usd(FAUCET_AMOUNT)} simulated USDC`); }}>
              <Coins data-icon="inline-start" /> Simulated top-up +{usd(FAUCET_AMOUNT)}
            </Button>
            <Button variant="ghost" onClick={() => { if (confirm("Reset all simulated progress?")) { g.reset(); toast("Progress reset."); } }}>
              <RotateCcw data-icon="inline-start" /> Reset save
            </Button>
          </div>
          <Separator />
          <div>
            <h3 className="mb-2 text-xs tracking-wider text-muted-foreground uppercase">Recent activity</h3>
            {g.log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Light a flask and descend.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
                {g.log.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-2 rounded bg-white/[0.03] px-2 py-1">
                    <span className="truncate">{e.label}</span>
                    <span className={`shrink-0 font-pixel text-xs ${e.kind === "spend" ? "text-foreground" : "text-gold"}`}>
                      {e.kind === "spend" ? `-${usd(e.amount)}` : `+${usd(e.amount)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
      <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className={`font-pixel text-sm ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
