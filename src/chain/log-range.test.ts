import { describe, expect, it } from "vitest";
import { LOG_SPAN, fetchInRanges } from "./log-range";

/** A provider that refuses wide queries the way some public RPCs do. */
function provider(maxSpan: bigint) {
  const calls: Array<[bigint, bigint]> = [];
  const fetchRange = async (from: bigint, to: bigint) => {
    calls.push([from, to]);
    if (to - from + 1n > maxSpan) {
      throw new Error(`Invalid parameters were provided to the RPC method.\nDetails: query spans ${to - from + 1n} blocks, but only ${maxSpan} are allowed for this request; narrow the block range`);
    }
    // One "event" per block that is a multiple of a million, so every block is reported exactly once.
    const found: bigint[] = [];
    for (let block = ((from + 999_999n) / 1_000_000n) * 1_000_000n; block <= to; block += 1_000_000n) found.push(block);
    return found;
  };
  return { calls, fetchRange };
}

describe("fetchInRanges", () => {
  it("never asks for more blocks than the span, and covers the whole range once", async () => {
    const { calls, fetchRange } = provider(10_000_000n);
    const got = await fetchInRanges(fetchRange, 63_000_000n, 76_700_000n);
    expect(calls.every(([from, to]) => to - from + 1n <= LOG_SPAN)).toBe(true);
    expect(calls[0][0]).toBe(63_000_000n);
    expect(calls[calls.length - 1][1]).toBe(76_700_000n);
    for (let i = 1; i < calls.length; i++) expect(calls[i][0]).toBe(calls[i - 1][1] + 1n);
    const expected: bigint[] = [];
    for (let block = 63_000_000n; block <= 76_700_000n; block += 1_000_000n) expected.push(block);
    expect(got).toEqual(expected);
  });

  it("halves a piece the provider still refuses", async () => {
    const { calls, fetchRange } = provider(1_000_000n);
    const got = await fetchInRanges(fetchRange, 63_000_000n, 66_999_999n);
    expect(got).toEqual([63_000_000n, 64_000_000n, 65_000_000n, 66_000_000n]);
    expect(calls.some(([from, to]) => to - from + 1n > 1_000_000n)).toBe(true);
    expect(calls[calls.length - 1][1]).toBe(66_999_999n);
  });

  it("does not hide a failure that narrowing cannot fix", async () => {
    await expect(fetchInRanges(async () => { throw new Error("RPC down"); }, 0n, 10n)).rejects.toThrow("RPC down");
  });

  it("handles a range shorter than one piece", async () => {
    const { calls, fetchRange } = provider(10_000_000n);
    await fetchInRanges(fetchRange, 70_000_000n, 70_000_010n);
    expect(calls).toEqual([[70_000_000n, 70_000_010n]]);
  });
});
