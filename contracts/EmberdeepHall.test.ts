// Runs the compiled Hall in a real EVM (ethereumjs) and signs descents with viem exactly as the server does.
import { beforeAll, describe, expect, it } from "vitest";
import {
  hashTypedData, keccak256, toEventSelector, toFunctionSelector, toHex, type AbiFunction, type AbiItem, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DESCENT_TYPES, hallDomain, type SignedDescent } from "../src/chain/hall-typed";
import { EVM_CHAIN_ID, EVM_NOW, deployHall } from "./hall-evm";

const signer = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const otherKey = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const OWNER = "0x00000000000000000000000000000000000000a0" as Hex;
const PLAYER = "0x00000000000000000000000000000000000000b1" as Hex;
const STRANGER = "0x00000000000000000000000000000000000000c2" as Hex;
const ZERO = "0x0000000000000000000000000000000000000000" as Hex;

let hall: Awaited<ReturnType<typeof deployHall>>;
let runs = 0;

const descent = (over: Partial<SignedDescent> = {}): SignedDescent => ({
  player: PLAYER, runId: keccak256(toHex(`run-${++runs}`)), depth: 5, gold: 612, kills: 14, home: true,
  bossSlain: false, deadline: EVM_NOW + 3600n, ...over,
});

const sign = (d: SignedDescent, account = signer, verifyingContract = hall.address!, chainId = EVM_CHAIN_ID) =>
  account.signTypedData({ domain: hallDomain(chainId, verifyingContract), types: DESCENT_TYPES, primaryType: "Descent", message: d });

const record = async (from: Hex, d: SignedDescent, signature: Hex, value?: bigint) => hall.call(from, "record", [d, signature], { value });

describe("EmberdeepHall", () => {
  beforeAll(async () => {
    hall = await deployHall(OWNER, signer.address);
    expect(hall.error).toBeUndefined();
  }, 120_000);

  it("starts with the deployer as owner and the given signer", async () => {
    expect((await hall.read("owner") as string).toLowerCase()).toBe(OWNER);
    expect(await hall.read("signer")).toBe(signer.address);
    expect(await hall.read("paused")).toBe(false);
    expect(await hall.read("totalRecords")).toBe(0n);
  });

  it("accepts a descent the signer signed, sent by its player, and emits it", async () => {
    const d = descent();
    const r = await record(PLAYER, d, await sign(d));
    if (!r.ok) throw new Error(r.error);
    expect(r.logs[0]?.eventName).toBe("DescentRecorded");
    expect(r.logs[0]?.args).toMatchObject({ runId: d.runId, depth: 5, gold: 612, kills: 14, home: true, bossSlain: false });
    expect(String(r.logs[0]?.args.player).toLowerCase()).toBe(PLAYER);
    expect(await hall.read("recorded", [d.runId])).toBe(true);
    expect(await hall.read("totalRecords")).toBe(1n);
    // A player's first record also adds them to the player list: still well under 200k gas, a fraction of a cent at
    // Arc's minimum gas price.
    expect(r.gas).toBeLessThan(200_000n);
  });

  it("computes the same digest the signer signs", async () => {
    const d = descent();
    const expected = hashTypedData({ domain: hallDomain(EVM_CHAIN_ID, hall.address!), types: DESCENT_TYPES, primaryType: "Descent", message: d });
    expect(await hall.read("digest", [d])).toBe(expected);
  });

  it("records a descent once", async () => {
    const d = descent();
    const signature = await sign(d);
    expect((await record(PLAYER, d, signature)).ok).toBe(true);
    expect(await record(PLAYER, d, signature)).toMatchObject({ ok: false, error: "AlreadyRecorded" });
  });

  it("refuses a signature from any other key", async () => {
    const d = descent();
    expect(await record(PLAYER, d, await sign(d, otherKey))).toMatchObject({ ok: false, error: "BadSignature" });
  });

  it("refuses a descent changed after it was signed", async () => {
    const d = descent();
    const signature = await sign(d);
    for (const change of [{ depth: 7 }, { gold: 99_999 }, { kills: 1 }, { home: false }, { bossSlain: true }, { deadline: EVM_NOW + 9999n }, { runId: keccak256("0x01") }]) {
      expect(await record(PLAYER, { ...d, ...change }, signature), JSON.stringify(Object.keys(change))).toMatchObject({ ok: false, error: "BadSignature" });
    }
  });

  it("refuses a signature made for another Hall or another chain", async () => {
    const d = descent();
    expect(await record(PLAYER, d, await sign(d, signer, "0x00000000000000000000000000000000000000ff"))).toMatchObject({ ok: false, error: "BadSignature" });
    expect(await record(PLAYER, d, await sign(d, signer, hall.address!, 5042))).toMatchObject({ ok: false, error: "BadSignature" });
  });

  it("refuses malformed signatures", async () => {
    const d = descent();
    for (const bad of ["0x", `0x${"00".repeat(65)}`, `0x${"ff".repeat(64)}`, `0x${"11".repeat(66)}`] as Hex[]) {
      expect(await record(PLAYER, d, bad)).toMatchObject({ ok: false, error: "BadSignature" });
    }
  });

  it("takes a descent from any sender, but always for the signed player and only once", async () => {
    const d = descent();
    const signature = await sign(d);
    const relayed = await record(STRANGER, d, signature);
    if (!relayed.ok) throw new Error(relayed.error);
    expect(String(relayed.logs[0]?.args.player).toLowerCase()).toBe(PLAYER);
    expect(await record(PLAYER, d, signature)).toMatchObject({ ok: false, error: "AlreadyRecorded" });
    // Naming someone else as the player breaks the server's signature.
    const claimed = descent();
    expect(await record(STRANGER, { ...claimed, player: STRANGER }, await sign(claimed))).toMatchObject({ ok: false, error: "BadSignature" });
  });

  it("refuses an expired signature and accepts one in its last second", async () => {
    const late = descent({ deadline: EVM_NOW - 1n });
    expect(await record(PLAYER, late, await sign(late))).toMatchObject({ ok: false, error: "Expired" });
    const edge = descent({ deadline: EVM_NOW });
    expect((await record(PLAYER, edge, await sign(edge))).ok).toBe(true);
  });

  it("refuses a depth outside 1-7 even when signed", async () => {
    for (const depth of [0, 8, 255]) {
      const d = descent({ depth });
      expect(await record(PLAYER, d, await sign(d))).toMatchObject({ ok: false, error: "BadDepth" });
    }
  });

  it("takes no USDC: sending value reverts everywhere", async () => {
    const d = descent();
    expect((await record(PLAYER, d, await sign(d), 1n)).ok).toBe(false);
    expect(await hall.raw(PLAYER, 1n)).toBe(false);
    expect((await hall.call(OWNER, "setPaused", [false], { value: 1n })).ok).toBe(false);
    expect((await hall.call(OWNER, "transferOwnership", [OWNER], { value: 1n })).ok).toBe(false);
  });

  it("lets only the owner pause, and a paused Hall takes no records", async () => {
    expect(await hall.call(STRANGER, "setPaused", [true])).toMatchObject({ ok: false, error: "NotOwner" });
    expect((await hall.call(OWNER, "setPaused", [true])).ok).toBe(true);
    const d = descent();
    expect(await record(PLAYER, d, await sign(d))).toMatchObject({ ok: false, error: "IsPaused" });
    expect((await hall.call(OWNER, "setPaused", [false])).ok).toBe(true);
    expect((await record(PLAYER, d, await sign(d))).ok).toBe(true);
  });

  it("lets only the owner rotate the signer, never to zero, and old signatures stop working", async () => {
    expect(await hall.call(STRANGER, "setSigner", [otherKey.address])).toMatchObject({ ok: false, error: "NotOwner" });
    expect(await hall.call(OWNER, "setSigner", [ZERO])).toMatchObject({ ok: false, error: "ZeroAddress" });
    const d = descent();
    const old = await sign(d);
    expect((await hall.call(OWNER, "setSigner", [otherKey.address])).ok).toBe(true);
    expect(await record(PLAYER, d, old)).toMatchObject({ ok: false, error: "BadSignature" });
    expect((await record(PLAYER, d, await sign(d, otherKey))).ok).toBe(true);
    expect((await hall.call(OWNER, "setSigner", [signer.address])).ok).toBe(true);
  });

  it("hands ownership over in two steps, and a handover can be cancelled", async () => {
    expect(await hall.call(STRANGER, "transferOwnership", [STRANGER])).toMatchObject({ ok: false, error: "NotOwner" });
    expect((await hall.call(OWNER, "transferOwnership", [STRANGER])).ok).toBe(true);
    expect((await hall.read("owner") as string).toLowerCase()).toBe(OWNER);
    expect(await hall.call(PLAYER, "acceptOwnership")).toMatchObject({ ok: false, error: "NotPendingOwner" });
    expect((await hall.call(STRANGER, "acceptOwnership")).ok).toBe(true);
    expect((await hall.read("owner") as string).toLowerCase()).toBe(STRANGER);
    expect(await hall.call(OWNER, "setPaused", [true])).toMatchObject({ ok: false, error: "NotOwner" });
    expect((await hall.call(STRANGER, "transferOwnership", [OWNER])).ok).toBe(true);
    expect((await hall.call(OWNER, "acceptOwnership")).ok).toBe(true);
    expect((await hall.call(OWNER, "transferOwnership", [STRANGER])).ok).toBe(true);
    expect((await hall.call(OWNER, "transferOwnership", [ZERO])).ok).toBe(true);
    expect(await hall.call(STRANGER, "acceptOwnership")).toMatchObject({ ok: false, error: "NotPendingOwner" });
  });

  it("keeps each player's best descent home and their count of runs, for the leaderboard", async () => {
    const board = await deployHall(OWNER, signer.address);
    const OTHER = "0x00000000000000000000000000000000000000e4" as Hex;
    const put = async (player: Hex, over: Partial<SignedDescent>) => {
      const d = descent({ player, ...over });
      const signature = await signer.signTypedData({ domain: hallDomain(EVM_CHAIN_ID, board.address!), types: DESCENT_TYPES, primaryType: "Descent", message: d });
      const r = await board.call(player, "record", [d, signature]);
      if (!r.ok) throw new Error(r.error);
      return r.gas;
    };
    const standing = async (player: Hex) => board.read("standingOf", [player]) as Promise<readonly [number, number, number, boolean, boolean, number]>;

    const first = await put(PLAYER, { depth: 6, gold: 900, home: false });
    expect(await standing(PLAYER)).toEqual([0, 0, 0, false, false, 1]); // lost in the dark: counted, not ranked
    await put(PLAYER, { depth: 3, gold: 100, kills: 4, home: true });
    await put(PLAYER, { depth: 3, gold: 50, home: true }); // less gold on the same floor
    const later = await put(PLAYER, { depth: 3, gold: 100, kills: 9, home: true }); // a tie keeps the earlier one
    expect(await standing(PLAYER)).toEqual([3, 100, 4, false, true, 4]);
    await put(PLAYER, { depth: 4, gold: 10, kills: 2, bossSlain: false, home: true }); // deeper beats more gold
    await put(PLAYER, { depth: 7, gold: 5, kills: 30, bossSlain: true, home: false }); // the boss, but never came home
    expect(await standing(PLAYER)).toEqual([4, 10, 2, false, true, 6]);
    await put(OTHER, { depth: 7, gold: 2000, kills: 40, bossSlain: true, home: true });

    expect(await board.read("playerCount")).toBe(2n);
    expect(await board.read("totalRecords")).toBe(7n);
    const [who, what] = await board.read("standings", [0n, 10n]) as readonly [readonly Hex[], readonly { depth: number; gold: number; runs: number; bossSlain: boolean }[]];
    expect(who.map(a => a.toLowerCase())).toEqual([PLAYER, OTHER]);
    expect(what.map(s => [s.depth, s.gold, s.runs, s.bossSlain])).toEqual([[4, 10, 6, false], [7, 2000, 1, true]]);
    // Pages: a window, the tail, and past the end.
    expect((await board.read("standings", [0n, 1n]) as readonly [readonly Hex[]])[0].map(a => a.toLowerCase())).toEqual([PLAYER]);
    expect((await board.read("standings", [1n, 10n]) as readonly [readonly Hex[]])[0].map(a => a.toLowerCase())).toEqual([OTHER]);
    expect((await board.read("standings", [5n, 10n]) as readonly [readonly Hex[]])[0]).toEqual([]);
    // A returning player costs less than a new one; both stay a fraction of a cent.
    expect(later).toBeLessThan(first);
    expect(first).toBeLessThan(200_000n);
  });

  it("cannot be deployed without a signer", async () => {
    expect((await deployHall(OWNER, ZERO)).error).toBeDefined();
  });

  it("matches the ABI the game calls it with", async () => {
    const { HALL_ABI } = await import("../src/chain/arc");
    const selectors = (abi: readonly AbiItem[]) => abi
      .filter(i => i.type === "function" || i.type === "event" || i.type === "error")
      .map(i => (i.type === "event" ? toEventSelector(i) : toFunctionSelector(i as AbiFunction)));
    const compiled = selectors(hall.abi);
    for (const selector of selectors(HALL_ABI as readonly AbiItem[])) expect(compiled).toContain(selector);
  });
});
