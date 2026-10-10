// Where the Hall of Descents lives on Arc. Plain values only, so the main bundle can ask "is the Hall there?"
// without pulling in viem (the code that talks to the chain is in arc.ts and loads on demand).

export const ARC_CHAIN_ID = 5042;
/**
 * Arc mainnet's public RPCs from Arc's docs, tried in this order. The primary one (rpc.mainnet.arc.io) refuses some
 * regions with Cloudflare's "error code: 1009" (seen from Ukraine on 2026-10-09), so the partners' endpoints go first.
 */
export const ARC_RPCS = [
  "https://rpc.blockdaemon.mainnet.arc.io",
  "https://rpc.drpc.mainnet.arc.io",
  "https://rpc.mainnet.arc.io",
] as const;
export const ARC_EXPLORER = "https://explorer.arc.io";

export type HallConfig = { address: `0x${string}` };

/** The deployed Hall. Null until it is deployed on Arc mainnet; the game then shows nothing about Arc. */
const DEPLOYED: HallConfig | null = null;

const ADDRESS = /^0x[\da-fA-F]{40}$/;

/** `VITE_ARC_HALL_ADDRESS` overrides the deployed Hall, for local tests. */
export function hallConfig(): HallConfig | null {
  const address = import.meta.env.VITE_ARC_HALL_ADDRESS as string | undefined;
  if (address && ADDRESS.test(address)) return { address: address as `0x${string}` };
  return DEPLOYED;
}

/** The signing server (server/attest.ts), on the same host as the game behind Caddy, or Vite's proxy in development. */
export const ATTEST_URL = (import.meta.env.VITE_ATTEST_URL as string | undefined) || "/api/attest";

export const txUrl = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${ARC_EXPLORER}/address/${address}`;
