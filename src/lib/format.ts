import { toUsd } from "@/game/config";

/** A share of a whole as a percentage: two decimals below 10%, one below 100%. */
export function percent(share: number) {
  const p = share * 100;
  const digits = p >= 10 ? 1 : 2;
  return `${p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

/** Money in the game is cents of simulated USDC; this shows it as dollars: 50 is "$0.50", 250000 is "$2,500". */
export function usd(cents: number) {
  const v = toUsd(cents);
  const digits = Math.abs(v) >= 1_000 ? 0 : 2;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
