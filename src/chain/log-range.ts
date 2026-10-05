/**
 * Public RPCs cap how many blocks one log query may span, and Arc makes a block in under a second, so a long history
 * (the Hall of Descents' records) is read in pieces.
 */
export const LOG_SPAN = 5_000_000n;

/** A provider's complaint that the query is too wide or too slow, which a narrower query can fix. */
const TOO_WIDE = /range|span|too many|exceed|limit|narrow|timed? ?out/i;

async function fetchSplitting<T>(fetchRange: (from: bigint, to: bigint) => Promise<T[]>, from: bigint, to: bigint): Promise<T[]> {
  try {
    return await fetchRange(from, to);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (to <= from || !TOO_WIDE.test(message)) throw error;
    const middle = from + (to - from) / 2n;
    return [...await fetchSplitting(fetchRange, from, middle), ...await fetchSplitting(fetchRange, middle + 1n, to)];
  }
}

/** Collects `fetchRange` over [from, to] in pieces of at most `span` blocks, halving a piece the provider still refuses. */
export async function fetchInRanges<T>(
  fetchRange: (from: bigint, to: bigint) => Promise<T[]>,
  from: bigint,
  to: bigint,
  span: bigint = LOG_SPAN,
): Promise<T[]> {
  const out: T[] = [];
  for (let start = from; start <= to; start += span) {
    const end = start + span - 1n < to ? start + span - 1n : to;
    out.push(...await fetchSplitting(fetchRange, start, end));
  }
  return out;
}
