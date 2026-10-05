import { ExternalLink, Loader2, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addressUrl, hallConfig } from "@/chain/arc-config";
import { shortAddress } from "@/lib/format";
import { useHall } from "@/state/hall";
import { useWallet } from "@/state/wallet";

/** The wall of the deepest descents recorded on Arc. It reads the chain directly and needs no wallet. */
export function HallDialog() {
  const { open, setOpen, board, boardStatus, boardError, refresh } = useHall();
  const me = useWallet(s => s.account);
  const config = hallConfig();
  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-pixel text-lime"><Trophy className="size-4" aria-hidden /> Hall of Descents</DialogTitle>
          <DialogDescription>
            The deepest delvers who came home, replayed and signed by the game, written to Arc by their own wallets.
          </DialogDescription>
        </DialogHeader>

        {boardStatus === "loading" && !board && (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Reading the wall from Arc…</p>
        )}
        {boardStatus === "error" && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            Could not read the Hall: {boardError}
          </p>
        )}
        {board && board.entries.length === 0 && boardStatus !== "error" && (
          <p className="py-6 text-sm text-muted-foreground">Nobody has come home and signed the wall yet. Finish a descent and record it, and yours is the first name here.</p>
        )}
        {board && board.entries.length > 0 && (
          <ol className="space-y-1.5" aria-label="Deepest descents recorded on Arc">
            {board.entries.map((e, i) => {
              const mine = me?.toLowerCase() === e.player.toLowerCase();
              return (
                <li key={e.player} className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${mine ? "border-lime/60 bg-lime/10" : "border-white/10 bg-black/40"}`}>
                  <span className="w-6 text-center font-pixel text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">{shortAddress(e.player)}{mine && <span className="ml-1 text-lime">you</span>}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {e.kills} dispersed · {e.runs} record{e.runs === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-pixel text-lime">Depth {e.depth}{e.bossSlain && <span className="ml-1 text-sigil" title="Cerberus slain">★</span>}</span>
                    <span className="block text-[11px] text-gold">{e.gold} gold</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {board && <span>{board.records} record{board.records === 1 ? "" : "s"} from {board.players} wallet{board.players === 1 ? "" : "s"}.</span>}
          <a className="inline-flex items-center gap-1 underline underline-offset-2" href={addressUrl(config.address)} target="_blank" rel="noreferrer">
            Contract on Arc <ExternalLink className="size-3" aria-hidden />
          </a>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void refresh()} disabled={boardStatus === "loading"}>
            <RefreshCw className={boardStatus === "loading" ? "animate-spin" : ""} data-icon="inline-start" /> Refresh
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          The game's server replayed every one of these descents move by move before it signed it, and the Hall takes no
          record without that signature. The loadout comes from the simulated economy in the player's browser, so it is
          held to what the game allows rather than proven. Nothing here moves tokens, and the Hall holds no funds.
        </p>
      </DialogContent>
    </Dialog>
  );
}
