// The browser wallet (EIP-1193). The game only asks it for an account and, for the Hall of Descents on Arc, to switch
// networks and send one record. It never asks for a signature on anything else and never moves funds.
import { isAddress, type Address } from "viem";

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function injectedProvider(): Eip1193 | null {
  return (globalThis as { ethereum?: Eip1193 }).ethereum ?? null;
}

export async function requestAccount(): Promise<Address> {
  const provider = injectedProvider();
  if (!provider) throw new Error("No browser wallet found. Install MetaMask, Rabby or another EVM wallet.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts?.[0];
  if (!account || !isAddress(account)) throw new Error("The wallet did not share an account.");
  return account;
}
