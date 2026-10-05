// A compiled EmberdeepHall in an in-memory EVM (ethereumjs), for the contract and server tests.
import { createEVM, type EVM } from "@ethereumjs/evm";
import { createAddressFromString, hexToBytes } from "@ethereumjs/util";
import {
  decodeErrorResult, decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeFunctionData, toHex, type Abi, type Hex,
} from "viem";
// @ts-expect-error -- a plain .mjs build script without type declarations
import { compileHall } from "../scripts/hall-compile.mjs";

/** The chain id the ethereumjs EVM reports by default. A signature's EIP-712 domain must use it. */
export const EVM_CHAIN_ID = 1;
export const EVM_NOW = 1_800_000_000n;

let compiled: { abi: Abi; bytecode: Hex } | null = null;
const artifact = () => (compiled ??= compileHall() as { abi: Abi; bytecode: Hex });

const block = (timestamp: bigint, coinbase: Hex) => ({
  header: {
    number: 1n, coinbase: createAddressFromString(coinbase), timestamp, difficulty: 0n, prevRandao: new Uint8Array(32),
    gasLimit: 30_000_000n, baseFeePerGas: 0n, getBlobGasPrice: () => 0n,
  },
});

export type CallResult =
  | { ok: true; out: Hex; logs: { eventName: string; args: Record<string, unknown> }[]; gas: bigint }
  | { ok: false; error: string; logs: [] };

export async function deployHall(owner: Hex, initialSigner: Hex) {
  const { abi, bytecode } = artifact();
  const evm: EVM = await createEVM();
  const args = encodeAbiParameters([{ type: "address" }], [initialSigner]).slice(2);
  const created = await evm.runCall({
    caller: createAddressFromString(owner), data: hexToBytes(`${bytecode}${args}` as Hex), gasLimit: 5_000_000n,
    skipBalance: true, block: block(EVM_NOW, owner) as never,
  });
  const address = created.createdAddress?.toString() as Hex | undefined;

  async function call(from: Hex, functionName: string, fnArgs: unknown[] = [], options: { value?: bigint; timestamp?: bigint } = {}): Promise<CallResult> {
    const result = await evm.runCall({
      caller: createAddressFromString(from), to: createAddressFromString(address!),
      data: hexToBytes(encodeFunctionData({ abi, functionName, args: fnArgs })), gasLimit: 1_000_000n,
      value: options.value ?? 0n, skipBalance: true, block: block(options.timestamp ?? EVM_NOW, owner) as never,
    });
    const out = toHex(result.execResult.returnValue);
    if (result.execResult.exceptionError) {
      let error = "revert";
      try { error = decodeErrorResult({ abi, data: out }).errorName; } catch { /* a plain revert without a reason */ }
      return { ok: false, error, logs: [] };
    }
    const logs = (result.execResult.logs ?? []).map(([, topics, data]) =>
      decodeEventLog({ abi, topics: topics.map(t => toHex(t)) as [Hex, ...Hex[]], data: toHex(data) }) as unknown as { eventName: string; args: Record<string, unknown> });
    return { ok: true, out, logs, gas: result.execResult.executionGasUsed };
  }

  async function read(functionName: string, fnArgs: unknown[] = []) {
    const r = await call("0x00000000000000000000000000000000000000d3", functionName, fnArgs);
    if (!r.ok) throw new Error(r.error);
    return decodeFunctionResult({ abi, functionName, data: r.out });
  }

  /** Sends raw calldata or plain value to the Hall, for the "takes no USDC" checks. */
  async function raw(from: Hex, value: bigint) {
    const result = await evm.runCall({
      caller: createAddressFromString(from), to: createAddressFromString(address!), value, data: new Uint8Array(),
      gasLimit: 100_000n, skipBalance: true, block: block(EVM_NOW, owner) as never,
    });
    return result.execResult.exceptionError === undefined;
  }

  return { abi, address, error: created.execResult.exceptionError, call, read, raw };
}
