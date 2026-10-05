// The Hall of Descents on Arc (contracts/EmberdeepHall.sol). The game's server replays a finished descent and signs
// it; the player's wallet then sends that signed record to the Hall. The Hall holds no funds. The leaderboard is
// rebuilt from the contract's events and needs no wallet.
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient, custom, defineChain, http, parseAbi,
  parseAbiItem, type Address, type Hash,
} from "viem";
import { ARC_CHAIN_ID, ARC_EXPLORER, ARC_RPC, hallConfig, type HallConfig } from "./arc-config";
import type { Eip1193 } from "./wallet";
import { fromWire, type Attestation } from "./hall-typed";
import { fetchInRanges } from "./log-range";

export const ARC = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc",
  // Arc's native token is USDC and it pays for gas. The protocol counts it with 18 decimals.
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
  blockExplorers: { default: { name: "Arc Explorer", url: ARC_EXPLORER } },
});

const DESCENT_EVENT = "event DescentRecorded(address indexed player, bytes32 indexed runId, uint8 depth, uint32 gold, uint16 kills, bool home, bool bossSlain)";

/** The part of the Hall's ABI the game uses. A test checks it against the compiled contract. */
export const HALL_ABI = parseAbi([
  "struct Descent { address player; bytes32 runId; uint8 depth; uint32 gold; uint16 kills; bool home; bool bossSlain; uint64 deadline; }",
  "function record(Descent d, bytes signature)",
  DESCENT_EVENT,
  "error IsPaused()",
  "error NotPlayer()",
  "error Expired()",
  "error BadDepth()",
  "error AlreadyRecorded()",
  "error BadSignature()",
]);

export const arcClient = createPublicClient({ chain: ARC, transport: http() });

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
        rpcUrls: [ARC_RPC],
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
  NotPlayer: "Switch the wallet back to the account that played this descent.",
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

export type DescentLog = {
  args: { player: Address; runId: `0x${string}`; depth: number; gold: number; kills: number; home: boolean; bossSlain: boolean };
  blockNumber?: bigint | null;
  logIndex?: number | null;
};

export type HallEntry = {
  player: Address; depth: number; gold: number; kills: number; bossSlain: boolean;
  /** Every record this wallet has written, including descents that did not come home. */
  runs: number;
};

export type HallBoard = { entries: HallEntry[]; records: number; players: number };

const order = (a: DescentLog, b: DescentLog) => {
  const blocks = (a.blockNumber ?? 0n) === (b.blockNumber ?? 0n) ? 0 : (a.blockNumber ?? 0n) < (b.blockNumber ?? 0n) ? -1 : 1;
  return blocks || (a.logIndex ?? 0) - (b.logIndex ?? 0);
};

/**
 * Each wallet's best descent that came home: deeper first, then more gold; on a tie the earlier record keeps its place.
 * A descent that did not come home is counted but never ranked, because its gold was lost.
 */
export function buildLeaderboard(logs: readonly DescentLog[], top = 10): HallBoard {
  const best = new Map<string, HallEntry>();
  const runs = new Map<string, number>();
  for (const log of [...logs].sort(order)) {
    const { player, depth, gold, kills, home, bossSlain } = log.args;
    const key = player.toLowerCase();
    runs.set(key, (runs.get(key) ?? 0) + 1);
    if (!home) continue;
    const have = best.get(key);
    if (!have || depth > have.depth || (depth === have.depth && gold > have.gold)) {
      best.set(key, { player, depth, gold, kills, bossSlain, runs: 0 });
    }
  }
  const entries = [...best.entries()]
    .map(([key, entry]) => ({ ...entry, runs: runs.get(key) ?? 0 }))
    .sort((a, b) => b.depth - a.depth || b.gold - a.gold);
  return { entries: entries.slice(0, top), records: logs.length, players: runs.size };
}

/** Reads every record the Hall has emitted and ranks them. Needs no wallet. */
export async function readHall(config: HallConfig | null = hallConfig()): Promise<HallBoard> {
  if (!config) return { entries: [], records: 0, players: 0 };
  const latest = await arcClient.getBlockNumber();
  const event = parseAbiItem(DESCENT_EVENT);
  const logs = await fetchInRanges(
    (fromBlock, toBlock) => arcClient.getLogs({ address: config.address, event, strict: true, fromBlock, toBlock }),
    config.fromBlock, latest,
  );
  return buildLeaderboard(logs);
}
