import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attestation } from "@/chain/hall-typed";
import type { RunReport } from "./store";

const arc = vi.hoisted(() => ({
  requestAttestation: vi.fn(),
  recordOnArc: vi.fn(),
  readHall: vi.fn(async () => ({ entries: [], records: 0, players: 0 })),
}));
vi.mock("@/chain/arc", async importOriginal => ({ ...await importOriginal<typeof import("@/chain/arc")>(), ...arc }));
vi.mock("@/chain/arc-config", async importOriginal => ({
  ...await importOriginal<typeof import("@/chain/arc-config")>(),
  hallConfig: () => ({ address: "0x0000000000000000000000000000000000000ee1", fromBlock: 0n }),
}));
vi.mock("@/chain/wallet", async importOriginal => ({
  ...await importOriginal<typeof import("@/chain/wallet")>(),
  injectedProvider: () => ({ request: async () => null }),
}));

const { useHall } = await import("./hall");
const { useRun } = await import("./run-store");
const { useWallet } = await import("./wallet");

const PLAYER = "0x00000000000000000000000000000000000000b1";
const report = (over: Partial<RunReport> = {}): RunReport => ({
  outcome: "extracted", depth: 4, gold: 300, crystals: 0, sigils: 0, payout: 0, spent: 10, revenue: 3.3, minted: [],
  tickets: 0, ticketsFound: 0, steps: 100, kills: 5, ...over,
});
const signed = (over: Partial<Attestation["descent"]> = {}): Attestation => ({
  descent: { player: PLAYER, runId: `0x${"12".repeat(32)}`, depth: 4, gold: 300, kills: 5, home: true, bossSlain: false, deadline: "1", ...over },
  signature: "0x00",
});

beforeEach(() => {
  arc.requestAttestation.mockReset();
  arc.recordOnArc.mockReset();
  useHall.setState({ forReport: null, status: "idle", txHash: null, error: null });
  useWallet.setState({ account: PLAYER, status: "ready" });
  useRun.setState({ lastDescent: { setup: { seed: 5, flasks: 2, perks: {} as never, weaponDamage: 2, bag: {} as never }, moves: ["R", "X"] } });
});

describe("recording a descent on Arc", () => {
  it("has the server replay the kept moves, then sends the signed record from the wallet", async () => {
    arc.requestAttestation.mockResolvedValue(signed());
    arc.recordOnArc.mockResolvedValue(`0x${"cd".repeat(32)}`);
    const r = report();
    await useHall.getState().record(r);
    expect(arc.requestAttestation).toHaveBeenCalledWith("/api/attest", expect.objectContaining({ player: PLAYER, moves: ["R", "X"] }));
    expect(arc.recordOnArc).toHaveBeenCalledOnce();
    expect(useHall.getState()).toMatchObject({ status: "done", forReport: r, txHash: `0x${"cd".repeat(32)}` });
  });

  it("records nothing when the server's replay disagrees with the report", async () => {
    arc.requestAttestation.mockResolvedValue(signed({ gold: 999 }));
    await useHall.getState().record(report());
    expect(arc.recordOnArc).not.toHaveBeenCalled();
    expect(useHall.getState()).toMatchObject({ status: "error" });
    expect(useHall.getState().error).toMatch(/does not match/);
  });

  it("says plainly when the moves were not kept", async () => {
    useRun.setState({ lastDescent: null });
    await useHall.getState().record(report());
    expect(arc.requestAttestation).not.toHaveBeenCalled();
    expect(useHall.getState().error).toMatch(/not kept/);
  });

  it("passes the server's refusal on", async () => {
    arc.requestAttestation.mockRejectedValue(new Error("The descent does not replay: The descent has not ended"));
    await useHall.getState().record(report());
    expect(useHall.getState().error).toMatch(/does not replay/);
  });

  it("needs a connected wallet", async () => {
    useWallet.setState({ account: null, status: "idle" });
    await useHall.getState().record(report());
    expect(arc.requestAttestation).not.toHaveBeenCalled();
    expect(useHall.getState().status).toBe("idle");
  });
});

describe("keeping the moves", () => {
  it("logs every move of a descent and keeps the log once it ends", async () => {
    const { NO_PERKS, WEAPONS } = await import("@/game/catalog");
    const { emptyBag } = await import("@/game/run");
    const setup = { seed: 31, flasks: 1, perks: NO_PERKS, weaponDamage: WEAPONS.dagger.damage, bag: emptyBag() };
    useRun.getState().start(setup);
    expect(useRun.getState().lastDescent).toBeNull();
    useRun.getState().act({ type: "wait" });
    useRun.getState().act({ type: "move", dx: 1, dy: 0 });
    expect(useRun.getState().log?.moves).toEqual(["W", "R"]);
    // Back onto the rift (if the step went through) and leave: the descent ends, and its log outlives the run screen.
    const s = useRun.getState().run!;
    const stepped = s.player.x !== s.floor.spawn.x;
    if (stepped) useRun.getState().act({ type: "move", dx: -1, dy: 0 });
    useRun.getState().act({ type: "extract" });
    expect(useRun.getState().run?.status).toBe("extracted");
    useRun.getState().clear();
    const kept = useRun.getState().lastDescent;
    expect(kept?.setup.seed).toBe(31);
    expect(kept?.moves).toEqual(stepped ? ["W", "R", "L", "X"] : ["W", "R", "X"]);
    const { replayRun } = await import("@/game/replay");
    expect(replayRun(kept!.setup, kept!.moves).state.status).not.toBe("playing");
  });
});
