import { useState } from "react";
import { Hourglass, Lock as LockIcon, LockOpen, Sprout } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { playSfx } from "@/audio/sfx";
import {
  EXIT_FEE, EXIT_FORFEIT, HOLD_FACTOR, LOCK_MAX, LOCK_SHARE, LOCK_START, LOCK_STEP, LOCK_TICKET_DUST, LOCK_TICKET_LOCKS,
  MATURITY_ROUNDS, STAKE_GOLD_CAP, STAKE_MAX, STAKE_STEP,
} from "@/game/config";
import { RARITY_INFO } from "@/game/catalog";
import {
  STAKE_LOCK_KEY, exitTerms, heroLockKey, heroLockValue, isMature, lockFactor, settleLocks,
  stakeGoldPct, tenure, type Lock,
} from "@/game/locks";
import { percent, usd } from "@/lib/format";
import { InsufficientFunds, LockError, useGame } from "@/state/store";
import { useUi } from "@/state/ui";
import { nftVisual } from "./hero-info";
import { HeroAvatar } from "./art";

const STAKE_ADDS = [500, 1_000, 2_500];
/** Passive gold is a count, not money. */
const num = (n: number) => Math.round(n).toLocaleString("en-US");

export function LockPanel() {
  const game = useGame();
  const [confirming, setConfirming] = useState<string | null>(null);

  const stake = game.locks.find(l => l.key === STAKE_LOCK_KEY);
  // What closing the round now would farm.
  const preview = settleLocks(game.locks, game.round, game.locked, game.fieldLockGold);
  const farmedTotal = game.locks.reduce((n, l) => n + l.farmed, 0);

  const run = (action: () => void, ok: string) => {
    try {
      action();
      playSfx("buy", useGame.getState().muted);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof InsufficientFunds || e instanceof LockError ? e.message : "That did not work.");
    }
  };

  const nameOf = (l: Lock) => {
    if (l.kind === "stake") return { title: `${usd(l.value)} stake`, sub: `Up to +${STAKE_GOLD_CAP}% gold, grows with age`, hero: null };
    const h = game.heroes.find(x => heroLockKey(x.id) === l.key);
    return h ? { title: nftVisual(h).name, sub: nftVisual(h).subtitle, hero: h } : { title: "Delver", sub: "", hero: null };
  };

  return (
    <div className="space-y-4">
      <Card className="ring-lime/25">
        <CardHeader>
          <CardTitle className="font-pixel text-lime">Lock to grow and to farm</CardTitle>
          <CardDescription>
            Simulated: nothing leaves your wallet. A perk you only hold works at {Math.round(HOLD_FACTOR * 100)}% strength. Lock the Delver or stake some USDC and it starts at{" "}
            {Math.round(LOCK_START * 100)}%, gains {Math.round(LOCK_STEP * 100)}% for every round closed and tops out at {Math.round(LOCK_MAX * 100)}%. Locks also farm the lock pool:{" "}
            {Math.round(LOCK_SHARE * 100)}% of every dollar spent, shared by passive gold and kept apart from the pool that descents compete for, so locking never takes anything from someone who plays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Lock pool" value={usd(game.locked)} accent="text-gold" sub="Shared when the round closes" />
            <Metric label="Your passive gold" value={num(preview.yourGold)} sub={`Everyone else ${num(game.fieldLockGold)} (simulated)`} />
            <Metric label="If the round closed now" value={`+${usd(Object.values(preview.payouts).reduce((a, b) => a + b, 0))}`} accent="text-lime" sub={`${percent(preview.share)} of the lock pool`} />
            <Metric label="Farmed and held" value={usd(farmedTotal)} accent="text-gold" sub="Paid when locks mature" />
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>After <b className="text-foreground">{MATURITY_ROUNDS} closed rounds</b> a lock is mature: harvest what it farmed and release it for free.</li>
            <li>Break it earlier and you forfeit {Math.round(EXIT_FORFEIT * 100)}% of what it farmed (it goes back to the lock pool) and pay a fee of {Math.round(EXIT_FEE * 100)}% of its value.</li>
            <li>Delver locks also farm a quarter of a raffle ticket per round ({LOCK_TICKET_DUST}), for your first {LOCK_TICKET_LOCKS} only, so tickets stay mostly for those who descend.</li>
            <li>Rounds close in the Vault. <button type="button" className="underline hover:text-foreground" onClick={() => useUi.getState().request("ledger")}>Open the Vault</button></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Your locks ({game.locks.length})</CardTitle>
          <CardDescription>Round {game.round}. Each lock ages by one when a round closes.</CardDescription>
        </CardHeader>
        <CardContent>
          {game.locks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing locked yet. Lock a Delver or stake some USDC below.</p>
          ) : (
            <ul className="space-y-2">
              {game.locks.map(l => {
                const info = nameOf(l);
                const age = tenure(l, game.round);
                const mature = isMature(l, game.round);
                const terms = exitTerms(l, game.round);
                const color = info.hero ? RARITY_INFO[info.hero.rarity].color : undefined;
                return (
                  <li key={l.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-md bg-black">
                      {info.hero ? <HeroAvatar portrait={nftVisual(info.hero).portrait!} px={2} /> : l.kind === "stake" ? <Sprout className="size-6 text-lime" /> : <LockIcon className="size-6 text-lime" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-pixel text-xs" style={{ color }}>{info.title}</span>
                        <Badge variant="outline">×{lockFactor(age).toFixed(2)} strength</Badge>
                        {l.kind === "stake" && <Badge variant="outline">+{stakeGoldPct(l, game.round)}% gold</Badge>}
                        {mature ? <Badge className="bg-lime text-black">Mature</Badge> : <Badge variant="outline"><Hourglass className="size-3" /> {MATURITY_ROUNDS - age} round{MATURITY_ROUNDS - age === 1 ? "" : "s"} to mature</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {info.sub} · locked {age} round{age === 1 ? "" : "s"} · farmed <span className="text-gold">{usd(l.farmed)}</span>
                        {l.kind !== "stake" && <> · {Math.round(l.dust * 100)}% of a ticket</>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mature && l.farmed > 0 && (
                        <Button size="sm" variant="outline" onClick={() => run(() => game.harvest(l.key), `Harvested ${usd(l.farmed)}.`)}>Harvest {usd(l.farmed)}</Button>
                      )}
                      {confirming === l.key ? (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => { setConfirming(null); run(() => game.unlock(l.key), `Lock broken. ${usd(terms.forfeit)} forfeited, ${usd(terms.fee)} fee.`); }}>
                            Confirm: forfeit {usd(terms.forfeit)} · fee {usd(terms.fee)}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Keep</Button>
                        </>
                      ) : (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => terms.early ? setConfirming(l.key) : run(() => game.unlock(l.key), l.kind === "stake" ? `Stake released: ${usd(terms.stakeBack + terms.payout)} back.` : `Released with ${usd(terms.payout)}.`)}
                        >
                          <LockOpen data-icon="inline-start" /> {terms.early ? "Break lock" : "Release"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-pixel">Lock something</CardTitle>
          <CardDescription>Locking does not stop you playing: a locked Delver still descends, only stronger.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section aria-label="Delvers">
            <h3 className="mb-2 text-xs tracking-wider text-muted-foreground uppercase">Delvers</h3>
            {game.heroes.filter(h => !game.locks.some(l => l.key === heroLockKey(h.id))).length === 0 ? (
              <p className="text-sm text-muted-foreground">{game.heroes.length === 0 ? "No Delvers yet. Mint one on the Mint tab." : "Every Delver you own is locked."}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {game.heroes.filter(h => !game.locks.some(l => l.key === heroLockKey(h.id))).map(h => {
                  const v = nftVisual(h);
                  return (
                    <li key={h.id} className="flex items-center gap-3 rounded-lg border bg-black/40 p-2" style={{ borderColor: `${v.color}44` }}>
                      {v.portrait && <HeroAvatar portrait={v.portrait} px={2} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[11px]" style={{ color: v.color }}>{v.name}</div>
                        <div className="text-[11px] text-muted-foreground">{v.subtitle} · counts as {usd(heroLockValue(h))}</div>
                      </div>
                      <Button size="sm" onClick={() => run(() => game.lockHero(h.id), `${v.name} locked.`)}><LockIcon data-icon="inline-start" /> Lock</Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Stake USDC">
            <h3 className="mb-2 text-xs tracking-wider text-muted-foreground uppercase">Stake USDC</h3>
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <p className="mb-3 text-xs text-muted-foreground">
                A stake leaves your balance but is yours to take back; it is never spent. It adds up to {STAKE_GOLD_CAP}% gold to every descent (1% per {usd(STAKE_STEP)}, growing with its age) and farms the lock pool.
                You can stake up to {usd(STAKE_MAX)}. Staked now: <b className="text-foreground">{usd(stake?.value ?? 0)}</b>.
              </p>
              <div className="flex flex-wrap gap-2">
                {STAKE_ADDS.map(n => (
                  <Button key={n} size="sm" variant="outline" disabled={game.balance < n || (stake?.value ?? 0) + n > STAKE_MAX} onClick={() => run(() => game.stake(n), `${usd(n)} staked.`)}>
                    <Sprout data-icon="inline-start" /> Stake {usd(n)}
                  </Button>
                ))}
              </div>
            </div>
          </section>
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
