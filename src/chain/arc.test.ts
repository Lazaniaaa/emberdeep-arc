import { describe, expect, it } from "vitest";
import { ContractFunctionRevertedError, decodeFunctionData, encodeErrorResult, getAddress, type Address } from "viem";
import {
  buildLeaderboard, explainArcError, HALL_ABI, readHall, recordOnArc, requestAttestation, STANDINGS_PAGE, switchToArc,
  type Standing,
} from "./arc";
import { ARC_CHAIN_ID, ARC_RPCS, hallConfig } from "./arc-config";
import type { Eip1193 } from "./wallet";
import { fromWire, type Attestation } from "./hall-typed";

const A = "0x00000000000000000000000000000000000000a1" as Address;
const B = "0x00000000000000000000000000000000000000b2" as Address;
const C = "0x00000000000000000000000000000000000000c3" as Address;
const HALL = { address: "0x0000000000000000000000000000000000000ee1" as Address };
const RUN = `0x${"12".repeat(32)}` as const;

const standing = (s: Partial<Standing> = {}): Standing => ({ depth: 1, gold: 0, kills: 0, bossSlain: false, ranked: true, runs: 1, ...s });

const attestation: Attestation = {
  descent: { player: A, runId: RUN, depth: 5, gold: 777, kills: 12, home: true, bossSlain: false, deadline: "1800003600" },
  signature: `0x${"ab".repeat(65)}`,
};

describe("buildLeaderboard", () => {
  it("ranks the players by their best descent home, deeper first and then by gold", () => {
    const board = buildLeaderboard(
      [A, B, C],
      [standing({ depth: 3, gold: 100, runs: 2 }), standing({ depth: 5, gold: 40 }), standing({ depth: 3, gold: 250 })],
      4,
    );
    expect(board.entries.map(e => [e.player, e.depth, e.gold])).toEqual([[B, 5, 40], [C, 3, 250], [A, 3, 100]]);
    expect(board.records).toBe(4);
    expect(board.players).toBe(3);
    expect(board.entries.find(e => e.player === A)?.runs).toBe(2);
  });

  it("counts a player who never came home but does not rank them", () => {
    const board = buildLeaderboard([A, B], [standing({ ranked: false, depth: 0, runs: 3 }), standing({ depth: 2, gold: 5 })], 4);
    expect(board.entries.map(e => e.player)).toEqual([B]);
    expect(board.records).toBe(4);
    expect(board.players).toBe(2);
  });

  it("lets the player who joined first keep a tie", () => {
    const tie = standing({ depth: 4, gold: 100 });
    expect(buildLeaderboard([A, B], [tie, tie], 2).entries.map(e => e.player)).toEqual([A, B]);
    expect(buildLeaderboard([B, A], [tie, tie], 2).entries.map(e => e.player)).toEqual([B, A]);
  });

  it("keeps only the top few", () => {
    const players = Array.from({ length: 15 }, (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}` as Address);
    const board = buildLeaderboard(players, players.map((_, i) => standing({ depth: 1 + (i % 7), gold: i })), 15, 10);
    expect(board.entries).toHaveLength(10);
    expect(buildLeaderboard([], [], 0).entries).toEqual([]);
  });
});

describe("readHall", () => {
  it("reads the standings page by page with plain calls, and ranks them", async () => {
    const count = Number(STANDINGS_PAGE) + 3;
    const players = Array.from({ length: count }, (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}` as Address);
    const calls: string[] = [];
    const client = {
      readContract: async ({ functionName, args }: { functionName: string; args?: readonly bigint[] }) => {
        calls.push(functionName);
        if (functionName === "playerCount") return BigInt(count);
        if (functionName === "totalRecords") return BigInt(count * 2);
        const [start, size] = args!;
        const who = players.slice(Number(start), Number(start + size));
        return [who, who.map((_, i) => standing({ depth: 1 + ((Number(start) + i) % 7), gold: Number(start) + i }))];
      },
    };
    const board = await readHall(HALL, client as never);
    expect(calls.filter(c => c === "standings")).toHaveLength(2);
    expect(board.players).toBe(count);
    expect(board.records).toBe(count * 2);
    expect(board.entries[0]?.depth).toBe(7);
  });

  it("shows an empty Hall before it is deployed", async () => {
    expect(await readHall(null)).toEqual({ entries: [], records: 0, players: 0 });
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
      chainId: "0x13b2", rpcUrls: [...ARC_RPCS], nativeCurrency: { symbol: "USDC", decimals: 18 },
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
    const refusal = (errorName: "AlreadyRecorded" | "Expired" | "BadSignature") => new ContractFunctionRevertedError({
      abi: HALL_ABI, functionName: "record", data: encodeErrorResult({ abi: HALL_ABI, errorName }),
    });
    expect(explainArcError(refusal("AlreadyRecorded"))).toMatch(/already/);
    expect(explainArcError(refusal("Expired"))).toMatch(/ran out/);
    expect(explainArcError(refusal("BadSignature"))).toMatch(/signature/);
  });
});

describe("hallConfig", () => {
  it("points at the Hall deployed on Arc mainnet", () => {
    expect(ARC_CHAIN_ID).toBe(5042);
    expect(hallConfig()).toEqual({ address: "0x0b03e2c77fee4edac4c51a5be04df7175d7b423a" });
  });
});
