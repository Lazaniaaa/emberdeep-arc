// Where the Hall of Descents lives on Arc. Plain values only, so the main bundle can ask "is the Hall there?"
// without pulling in viem (the code that talks to the chain is in arc.ts and loads on demand).

export const ARC_CHAIN_ID = 5042;
export const ARC_RPC = "https://rpc.mainnet.arc.io";
export const ARC_EXPLORER = "https://explorer.arc.io";

export type HallConfig = { address: `0x${string}`; fromBlock: bigint };

/** The deployed Hall. Null until it is deployed on Arc mainnet; the game then shows nothing about Arc. */
const DEPLOYED: HallConfig | null = null;

const ADDRESS = /^0x[\da-fA-F]{40}$/;

/** `VITE_ARC_HALL_ADDRESS` (and optionally `VITE_ARC_HALL_FROM_BLOCK`) override the deployed Hall, for local tests. */
export function hallConfig(): HallConfig | null {
  const address = import.meta.env.VITE_ARC_HALL_ADDRESS as string | undefined;
  if (address && ADDRESS.test(address)) {
    const from = Number(import.meta.env.VITE_ARC_HALL_FROM_BLOCK ?? 0);
    return { address: address as `0x${string}`, fromBlock: BigInt(Number.isSafeInteger(from) && from > 0 ? from : 0) };
  }
  return DEPLOYED;
}

/** The signing server (server/attest.ts), on the same host as the game behind Caddy, or Vite's proxy in development. */
export const ATTEST_URL = (import.meta.env.VITE_ATTEST_URL as string | undefined) || "/api/attest";

export const txUrl = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${ARC_EXPLORER}/address/${address}`;
