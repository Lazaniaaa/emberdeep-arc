import type { Address } from "viem";
import { create } from "zustand";

type BrowserProvider = { on?: (event: string, cb: (...args: unknown[]) => void) => void };
const injectedProvider = () => (globalThis as { ethereum?: BrowserProvider }).ethereum ?? null;

/** The connected wallet. The game needs one only to write a descent into the Hall of Descents on Arc. */
type WalletState = {
  status: "idle" | "connecting" | "ready" | "error";
  account: Address | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export const useWallet = create<WalletState>()((set, get) => {
  let revision = 0;

  const provider = injectedProvider();
  provider?.on?.("accountsChanged", (...args: unknown[]) => {
    const accounts = args[0] as string[];
    if (get().status === "idle") return;
    if (!accounts?.length) get().disconnect();
    else set({ account: accounts[0] as Address, status: "ready", error: null });
  });

  return {
    status: "idle", account: null, error: null,

    connect: async () => {
      const request = ++revision;
      set({ status: "connecting", error: null });
      try {
        // Loaded on demand, so viem stays out of the first page load.
        const { requestAccount } = await import("@/chain/wallet");
        const account = await requestAccount();
        if (request === revision) set({ status: "ready", account });
      } catch (e) {
        if (request === revision) set({ status: "error", error: e instanceof Error ? e.message.split("\n")[0] : "Wallet connection failed" });
      }
    },

    disconnect: () => {
      revision++;
      set({ status: "idle", account: null, error: null });
    },
  };
});
