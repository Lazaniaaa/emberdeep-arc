import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";

const chain = vi.hoisted(() => ({ requestAccount: vi.fn() }));
vi.mock("@/chain/wallet", () => ({ requestAccount: chain.requestAccount }));

import { useWallet } from "./wallet";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

const account = "0x0000000000000000000000000000000000000001" as Address;

describe("wallet", () => {
  beforeEach(() => {
    useWallet.getState().disconnect();
    vi.clearAllMocks();
  });

  it("connects and keeps the account", async () => {
    chain.requestAccount.mockResolvedValue(account);
    await useWallet.getState().connect();
    expect(useWallet.getState()).toMatchObject({ status: "ready", account, error: null });
  });

  it("reports a refused connection in one line", async () => {
    chain.requestAccount.mockRejectedValue(new Error("User rejected the request.\nDetails: …"));
    await useWallet.getState().connect();
    expect(useWallet.getState()).toMatchObject({ status: "error", account: null, error: "User rejected the request." });
  });

  it("ignores a connection that finishes after the player disconnected", async () => {
    const slow = deferred<Address>();
    chain.requestAccount.mockReturnValue(slow.promise);
    const pending = useWallet.getState().connect();
    useWallet.getState().disconnect();
    slow.resolve(account);
    await pending;
    expect(useWallet.getState()).toMatchObject({ status: "idle", account: null });
  });
});
