import { describe, expect, it } from "vitest";
import { ContractFunctionRevertedError, decodeFunctionData, encodeErrorResult, getAddress, type Address } from "viem";
import {
  buildLeaderboard, explainArcError, HALL_ABI, recordOnArc, requestAttestation, switchToArc, type DescentLog,
} from "./arc";
import { hallConfig } from "./arc-config";
import type { Eip1193 } from "./wallet";
import { fromWire, type Attestation } from "./hall-typed";

const A = "0x00000000000000000000000000000000000000a1" as Address;
const B = "0x00000000000000000000000000000000000000b2" as Address;
const C = "0x00000000000000000000000000000000000000c3" as Address;
const HALL = { address: "0x0000000000000000000000000000000000000ee1" as Address, fromBlock: 0n };
const RUN = `0x${"12".repeat(32)}` as const;

const log = (player: Address, r: Partial<DescentLog["args"]>, block = 1n, index = 0): DescentLog => ({
  args: { player, runId: RUN, depth: 1, gold: 0, kills: 0, home: true, bossSlain: false, ...r },
  blockNumber: block, logIndex: index,
});

const attestation: Attestation = {
  descent: { player: A, runId: RUN, depth: 5, gold: 777, kills: 12, home: true, bossSlain: false, deadline: "1800003600" },
  signature: `0x${"ab".repeat(65)}`,
};

describe("buildLeaderboard", () => {
  it("ranks each wallet by its best descent, deeper first and then by gold", () => {
    const board = buildLeaderboard([
      log(A, { depth: 3, gold: 100 }, 1n),
      log(B, { depth: 5, gold: 40 }, 2n),
      log(C, { depth: 3, gold: 250 }, 3n),
      log(A, { depth: 3, gold: 90 }, 4n),
    ]);
    expect(board.entries.map(e => [e.player, e.depth, e.gold])).toEqual([[B, 5, 40], [C, 3, 250], [A, 3, 100]]);
    expect(board.records).toBe(4);
    expect(board.players).toBe(3);
    expect(board.entries.find(e => e.player === A)?.runs).toBe(2);
  });

  it("counts a descent that did not come home but never ranks it", () => {
    const board = buildLeaderboard([log(A, { depth: 6, gold: 500, home: false }), log(B, { depth: 2, gold: 5 })]);
    expect(board.entries.map(e => e.player)).toEqual([B]);
    expect(board.records).toBe(2);
    expect(board.players).toBe(2);
  });

  it("lets the earlier record keep a tie, whatever order the logs arrive in", () => {
    const first = log(A, { depth: 4, gold: 100, kills: 1 }, 5n, 0);
    const later = log(A, { depth: 4, gold: 100, kills: 2 }, 9n, 0);
    expect(buildLeaderboard([later, first]).entries[0]?.kills).toBe(1);
    expect(buildLeaderboard([first, later]).entries[0]?.kills).toBe(1);
  });

  it("treats an address as the same wallet whatever its letter case", () => {
    const upper = A.replace("a1", "A1") as Address;
    const board = buildLeaderboard([log(A, { depth: 2 }), log(upper, { depth: 3 })]);
    expect(board.entries).toHaveLength(1);
    expect(board.players).toBe(1);
  });

  it("keeps only the top few", () => {
    const logs = Array.from({ length: 15 }, (_, i) =>
      log(`0x${(i + 1).toString(16).padStart(40, "0")}` as Address, { depth: 1 + (i % 7), gold: i }));
    expect(buildLeaderboard(logs, 10).entries).toHaveLength(10);
    expect(buildLeaderboard([]).entries).toEqual([]);
  });
});

function fakeWallet(options: { unknownChain?: boolean; reject?: boolean; failSwitch?: unknown } = {}) {
  const calls: { method: string; params?: unknown[] }[] = [];
  let added = false;
  const provider: Eip1193 = {
    request: async ({ method, params }) => {
      calls.push({ method, params });
      switch (method) {
        case "wallet_switchEthereumChain":
          if (options.failSwitch) throw options.failSwitch;
          if (options.unknownChain && !added) throw Object.assign(new Error("Unrecognized chain ID"), { code: 4902 });
          return null;
        case "wallet_addEthereumChain": added = true; return null;
        case "eth_chainId": return "0x13b2";
        case "eth_sendTransaction":
          if (options.reject) throw Object.assign(new Error("User rejected the request."), { code: 4001 });
          return `0x${"cd".repeat(32)}`;
        default: throw new Error(`unexpected ${method}`);
      }
    },
  };
  return { provider, calls };
}

describe("switchToArc", () => {
  it("only switches when the wallet knows Arc", async () => {
    const { provider, calls } = fakeWallet();
    await switchToArc(provider);
    expect(calls.map(c => c.method)).toEqual(["wallet_switchEthereumChain"]);
    expect(calls[0]?.params).toEqual([{ chainId: "0x13b2" }]);
  });

  it("adds Arc, with USDC as its currency, when the wallet has never seen it", async () => {
    const { provider, calls } = fakeWallet({ unknownChain: true });
    await switchToArc(provider);
    expect(calls.map(c => c.method)).toEqual(["wallet_switchEthereumChain", "wallet_addEthereumChain"]);
    expect(calls[1]?.params?.[0]).toMatchObject({
      chainId: "0x13b2", rpcUrls: ["https://rpc.mainnet.arc.io"], nativeCurrency: { symbol: "USDC", decimals: 18 },
    });
  });

  it("does not hide other failures", async () => {
    const { provider } = fakeWallet({ failSwitch: Object.assign(new Error("User rejected the request."), { code: 4001 }) });
    await expect(switchToArc(provider)).rejects.toThrow(/rejected/);
  });
});

describe("recordOnArc", () => {
  const reader = (status = "success", refuse?: Error) => {
    const order: string[] = [];
    return {
      order,
      client: {
        simulateContract: async () => { order.push("simulate"); if (refuse) throw refuse; return {}; },
        waitForTransactionReceipt: async () => { order.push("wait"); return { status }; },
      } as never,
    };
  };

  it("checks the signed record, sends it once to the Hall and waits for it", async () => {
    const { provider, calls } = fakeWallet();
    const { client, order } = reader();
    const steps: string[] = [];
    const hash = await recordOnArc(provider, A, HALL, attestation, s => steps.push(s), client);
    expect(hash).toBe(`0x${"cd".repeat(32)}`);
    expect(steps).toEqual(["switching", "signing", "confirming"]);
    expect(order).toEqual(["simulate", "wait"]);

    const sent = calls.find(c => c.method === "eth_sendTransaction")?.params?.[0] as { to: string; from: string; data: `0x${string}`; value?: string };
    expect(sent.to.toLowerCase()).toBe(HALL.address);
    expect(sent.from.toLowerCase()).toBe(A);
    expect(sent.value ?? "0x0").toBe("0x0");
    const decoded = decodeFunctionData({ abi: HALL_ABI, data: sent.data });
    expect(decoded.functionName).toBe("record");
    expect(decoded.args).toEqual([{ ...fromWire(attestation.descent), player: getAddress(A) }, attestation.signature]);
  });

  it("asks for no signature when the Hall would refuse the record", async () => {
    const { provider, calls } = fakeWallet();
    const { client } = reader("success", new Error("AlreadyRecorded"));
    await expect(recordOnArc(provider, A, HALL, attestation, undefined, client)).rejects.toThrow();
    expect(calls.some(c => c.method === "eth_sendTransaction")).toBe(false);
  });

  it("fails when the transaction reverts, and stops when the player rejects", async () => {
    await expect(recordOnArc(fakeWallet().provider, A, HALL, attestation, undefined, reader("reverted").client)).rejects.toThrow(/reverted/);
    await expect(recordOnArc(fakeWallet({ reject: true }).provider, A, HALL, attestation, undefined, reader().client)).rejects.toThrow(/rejected/);
  });
});

describe("requestAttestation", () => {
  const body = { player: A, setup: { seed: 1 }, moves: ["X"] };

  it("posts the descent as JSON and returns the signed result", async () => {
    let sent: RequestInit | undefined;
    const fake = (async (_url: string, init: RequestInit) => { sent = init; return new Response(JSON.stringify(attestation), { status: 200 }); }) as typeof fetch;
    expect(await requestAttestation("/api/attest", body, fake)).toEqual(attestation);
    expect(sent?.method).toBe("POST");
    expect(JSON.parse(String(sent?.body))).toEqual(body);
  });

  it("passes the server's reason on", async () => {
    const refusing = (async () => new Response(JSON.stringify({ error: "The descent does not replay: Too many moves" }), { status: 422 })) as typeof fetch;
    await expect(requestAttestation("/api/attest", body, refusing)).rejects.toThrow(/does not replay/);
    const broken = (async () => new Response("<html>bad gateway</html>", { status: 502 })) as typeof fetch;
    await expect(requestAttestation("/api/attest", body, broken)).rejects.toThrow(/502/);
    const offline = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
    await expect(requestAttestation("/api/attest", body, offline)).rejects.toThrow(/cannot be reached/);
  });
});

describe("explainArcError", () => {
  it("speaks plainly about the usual failures", () => {
    expect(explainArcError(Object.assign(new Error("x"), { code: 4001 }))).toMatch(/Cancelled/);
    expect(explainArcError(new Error("insufficient funds for gas * price + value"))).toMatch(/Not enough USDC/);
    expect(explainArcError(new Error("RPC down\nstack"))).toBe("RPC down");
    expect(explainArcError(null)).toMatch(/Could not record/);
  });

  it("names the Hall's refusals", () => {
    const refusal = (errorName: "AlreadyRecorded" | "Expired" | "NotPlayer") => new ContractFunctionRevertedError({
      abi: HALL_ABI, functionName: "record", data: encodeErrorResult({ abi: HALL_ABI, errorName }),
    });
    expect(explainArcError(refusal("AlreadyRecorded"))).toMatch(/already/);
    expect(explainArcError(refusal("Expired"))).toMatch(/ran out/);
    expect(explainArcError(refusal("NotPlayer"))).toMatch(/account that played/);
  });
});

describe("hallConfig", () => {
  it("is off until the Hall is deployed", () => {
    expect(hallConfig()).toBeNull();
  });
});
