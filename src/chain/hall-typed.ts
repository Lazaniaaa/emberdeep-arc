// The EIP-712 shape of a signed descent. The contract (contracts/EmberdeepHall.sol), the signing server
// (server/attest.ts) and the game all use this one definition, and the contract tests check that a signature made from
// it is the one the contract accepts. Plain values only, so it can be imported anywhere without pulling in viem.

export const HALL_DOMAIN = { name: "Emberdeep Hall", version: "1" } as const;

export const DESCENT_TYPES = {
  Descent: [
    { name: "player", type: "address" },
    { name: "runId", type: "bytes32" },
    { name: "depth", type: "uint8" },
    { name: "gold", type: "uint32" },
    { name: "kills", type: "uint16" },
    { name: "home", type: "bool" },
    { name: "bossSlain", type: "bool" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export type Hex = `0x${string}`;

export type SignedDescent = {
  player: Hex;
  runId: Hex;
  depth: number;
  gold: number;
  kills: number;
  home: boolean;
  bossSlain: boolean;
  deadline: bigint;
};

/** The same descent as JSON can carry it: the deadline as a decimal string. */
export type DescentWire = Omit<SignedDescent, "deadline"> & { deadline: string };

export const toWire = (d: SignedDescent): DescentWire => ({ ...d, deadline: d.deadline.toString() });

export const fromWire = (d: DescentWire): SignedDescent => ({ ...d, deadline: BigInt(d.deadline) });

export const hallDomain = (chainId: number, verifyingContract: Hex) => ({ ...HALL_DOMAIN, chainId, verifyingContract });

/** What the signing server answers: the descent it replayed and its signature over it. */
export type Attestation = { descent: DescentWire; signature: Hex };
