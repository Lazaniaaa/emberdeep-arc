// The Hall of Descents on Arc (contracts/EmberdeepHall.sol). The game's server replays a finished descent and signs
// it; the player's wallet then sends that signed record to the Hall. The Hall holds no funds. The leaderboard is
// read from the standings the Hall keeps, with plain calls: it needs no wallet and no log history.
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient, custom, defineChain, fallback, http,
  parseAbi, type Address, type Hash,
} from "viem";
import { ARC_CHAIN_ID, ARC_EXPLORER, ARC_NETWORK, ARC_RPCS, hallConfig, type HallConfig } from "./arc-config";
import type { Eip1193 } from "./wallet";
import { fromWire, type Attestation } from "./hall-typed";

export const ARC = defineChain({
  id: ARC_CHAIN_ID,
  name: ARC_NETWORK.name,
  // Arc's native token is USDC and it pays for gas. The protocol counts it with 18 decimals.
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [...ARC_RPCS] } },
  blockExplorers: { default: { name: "Arc Explorer", url: ARC_EXPLORER } },
});

/** The part of the Hall's ABI the game uses. A test checks it against the compiled contract. */
export const HALL_ABI = parseAbi([
  "struct Descent { address player; bytes32 runId; uint8 depth; uint32 gold; uint16 kills; bool home; bool bossSlain; uint64 deadline; }",
  "struct Standing { uint8 depth; uint32 gold; uint16 kills; bool bossSlain; bool ranked; uint32 runs; }",
  "function record(Descent d, bytes signature)",
  "function totalRecords() view returns (uint256)",
  "function playerCount() view returns (uint256)",
  "function standings(uint256 start, uint256 count) view returns (address[] who, Standing[] what)",
  "event DescentRecorded(address indexed player, bytes32 indexed runId, uint8 depth, uint32 gold, uint16 kills, bool home, bool bossSlain)",
  "error IsPaused()",
  "error Expired()",
  "error BadDepth()",
  "error AlreadyRecorded()",
  "error BadSignature()",
]);

/** Reads Arc through the first RPC that answers. */
export const arcClient = createPublicClient({ chain: ARC, transport: fallback(ARC_RPCS.map(url => http(url))) });

// ── the signing server ─────────────────────────────────────────────────────────────────────────────────

export type AttestRequest = { player: Address; setup: unknown; moves: string[] };

/** Sends a finished descent to the server, which replays it and answers with the signed result. */
export async function requestAttestation(url: string, body: AttestRequest, fetchImpl: typeof fetch = fetch): Promise<Attestation> {
  let res: Response;
  try {
    res = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("The game's server cannot be reached. Try again in a moment.");
  }
  const data = await res.json().catch(() => null) as (Attestation & { error?: string }) | null;
  if (!res.ok || !data?.descent || !data.signature) throw new Error(data?.error ?? `The game's server answered ${res.status}.`);
  return data;
}

// ── wallet side ────────────────────────────────────────────────────────────────────────────────────────

const CHAIN_HEX = `0x${ARC_CHAIN_ID.toString(16)}`;

const isUnknownChain = (error: unknown) => {
  const e = error as { code?: number; message?: string } | null;
  return e?.code === 4902 || /unrecognized chain|not been added|add (this |the )?chain|chain.*not (added|found)/i.test(e?.message ?? "");
};

/** Switches the wallet to Arc, asking it to add the network first if it has never seen it. */
export async function switchToArc(provider: Eip1193) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (error) {
    if (!isUnknownChain(error)) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_HEX,
        chainName: ARC.name,
        nativeCurrency: ARC.nativeCurrency,
        rpcUrls: [...ARC_RPCS],
        blockExplorerUrls: [ARC_EXPLORER],
      }],
    });
  }
}

export type RecordStep = "switching" | "signing" | "confirming";

type ArcReader = Pick<typeof arcClient, "simulateContract" | "waitForTransactionReceipt">;

/**
 * Switches to Arc, checks the record against the Hall (so a refusal is explained before anything is signed), asks
 * the wallet to send it and waits for it to land. Arc settles in under a second.
 */
export async function recordOnArc(
  provider: Eip1193,
  account: Address,
  config: HallConfig,
  attestation: Attestation,
  onStep: (step: RecordStep) => void = () => {},
  client: ArcReader = arcClient,
): Promise<Hash> {
  const args = [fromWire(attestation.descent), attestation.signature] as const;
  onStep("switching");
  await switchToArc(provider);
  await client.simulateContract({ address: config.address, abi: HALL_ABI, functionName: "record", args, account });
  onStep("signing");
  const wallet = createWalletClient({ account, chain: ARC, transport: custom(provider) });
  const hash = await wallet.writeContract({ address: config.address, abi: HALL_ABI, functionName: "record", args });
  onStep("confirming");
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error("The Hall refused the record (the transaction reverted).");
  return hash;
}

const REFUSALS: Record<string, string> = {
  AlreadyRecorded: "This descent is in the Hall already.",
  Expired: "The server's signature ran out. Record it again for a fresh one.",
  IsPaused: "The Hall is paused for now. Nothing was recorded.",
  BadSignature: "The Hall did not accept the server's signature. The server may be set up for another Hall.",
  BadDepth: "The Hall refused the depth of this descent.",
};

/** A wallet, RPC or contract error as one short sentence a player can act on. */
export function explainArcError(error: unknown): string {
  if (error instanceof BaseError) {
    const reverted = error.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = reverted?.data?.errorName;
    if (name && REFUSALS[name]) return REFUSALS[name];
  }
  const e = error as { code?: number; shortMessage?: string; message?: string } | null;
  const text = e?.shortMessage ?? e?.message ?? "";
  if (e?.code === 4001 || /user (rejected|denied)|rejected the request/i.test(text)) return "Cancelled in the wallet. Nothing was recorded.";
  if (/insufficient (funds|balance)|exceeds the balance|gas required exceeds/i.test(text)) {
    return "Not enough USDC on Arc to pay the gas. A record costs well under a cent.";
  }
  return text.split("\n")[0] || "Could not record the descent on Arc.";
}

// ── reading the Hall ───────────────────────────────────────────────────────────────────────────────────

/** A player's standing as the Hall keeps it: their best descent home, and every descent they recorded. */
export type Standing = { depth: number; gold: number; kills: number; bossSlain: boolean; ranked: boolean; runs: number };

export type HallEntry = {
  player: Address; depth: number; gold: number; kills: number; bossSlain: boolean;
  /** Every record this wallet has written, including descents that did not come home. */
  runs: number;
};

export type HallBoard = { entries: HallEntry[]; records: number; players: number };

/**
 * Ranks the Hall's players by their best descent that came home: deeper first, then more gold. On a tie the player
 * who joined the Hall first keeps the place (the sort is stable over the Hall's join order). A player who never came
 * home is counted but not ranked, because the gold of every descent they recorded was lost.
 */
export function buildLeaderboard(players: readonly Address[], standings: readonly Standing[], records: number, top = 10): HallBoard {
  const entries = players
    .flatMap((player, i) => {
      const s = standings[i];
      return s?.ranked ? [{ player, depth: s.depth, gold: s.gold, kills: s.kills, bossSlain: s.bossSlain, runs: s.runs }] : [];
    })
    .sort((a, b) => b.depth - a.depth || b.gold - a.gold);
  return { entries: entries.slice(0, top), records, players: players.length };
}

/** How many players one call reads. Each is two words of return data, so a page stays far below any RPC's limits. */
export const STANDINGS_PAGE = 500n;

type HallReader = Pick<typeof arcClient, "readContract">;

/** Reads every player's standing from the Hall and ranks them. Needs no wallet. */
export async function readHall(config: HallConfig | null = hallConfig(), client: HallReader = arcClient): Promise<HallBoard> {
  if (!config) return { entries: [], records: 0, players: 0 };
  const hall = { address: config.address, abi: HALL_ABI } as const;
  const [count, records] = await Promise.all([
    client.readContract({ ...hall, functionName: "playerCount" }),
    client.readContract({ ...hall, functionName: "totalRecords" }),
  ]);
  const players: Address[] = [];
  const standings: Standing[] = [];
  for (let start = 0n; start < count; start += STANDINGS_PAGE) {
    const [who, what] = await client.readContract({ ...hall, functionName: "standings", args: [start, STANDINGS_PAGE] });
    players.push(...who);
    standings.push(...what);
  }
  return buildLeaderboard(players, standings, Number(records));
}
