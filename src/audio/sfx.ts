import type { RunEvent } from "@/game/run";
import { audioContext } from "./context";

type Cue = { freq: number; to?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

const CUES: Partial<Record<RunEvent | "buy" | "mint" | "burn", Cue[]>> = {
  step: [{ freq: 90, dur: 0.03, type: "square", gain: 0.02 }],
  bump: [{ freq: 60, dur: 0.05, type: "square", gain: 0.03 }],
  gold: [{ freq: 880, to: 1320, dur: 0.08, type: "square", gain: 0.04 }],
  crystal: [{ freq: 1500, to: 2200, dur: 0.12, type: "sine", gain: 0.05 }],
  oil: [{ freq: 300, to: 500, dur: 0.12, type: "triangle", gain: 0.05 }],
  chest: [{ freq: 660, dur: 0.07, type: "square", gain: 0.04 }, { freq: 990, dur: 0.1, type: "square", gain: 0.04, delay: 0.07 }],
  vault: [{ freq: 440, dur: 0.1, type: "square", gain: 0.04 }, { freq: 660, dur: 0.12, type: "square", gain: 0.04, delay: 0.1 }],
  sigil: [440, 554, 659, 880].map((f, i) => ({ freq: f, dur: 0.14, type: "triangle" as const, gain: 0.06, delay: i * 0.1 })),
  ticket: [{ freq: 990, dur: 0.08, type: "square", gain: 0.045 }, { freq: 1480, dur: 0.1, type: "square", gain: 0.04, delay: 0.08 }],
  hit: [{ freq: 200, to: 120, dur: 0.07, type: "sawtooth", gain: 0.04 }],
  kill: [{ freq: 300, to: 60, dur: 0.18, type: "sawtooth", gain: 0.05 }],
  boss: [196, 262, 330, 392, 523, 659].map((f, i) => ({ freq: f, dur: 0.2, type: "sawtooth" as const, gain: 0.05, delay: i * 0.08 })),
  hoard: [262, 330, 392, 523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.16, type: "square" as const, gain: 0.05, delay: i * 0.07 })),
  sealed: [{ freq: 110, dur: 0.08, type: "square", gain: 0.04 }, { freq: 82, dur: 0.14, type: "square", gain: 0.04, delay: 0.09 }],
  warn: [{ freq: 520, dur: 0.05, type: "square", gain: 0.03 }, { freq: 520, dur: 0.05, type: "square", gain: 0.03, delay: 0.09 }],
  miss: [{ freq: 700, to: 300, dur: 0.1, type: "triangle", gain: 0.035 }],
  smash: [{ freq: 180, to: 90, dur: 0.06, type: "square", gain: 0.04 }, { freq: 420, to: 200, dur: 0.05, type: "sawtooth", gain: 0.03, delay: 0.02 }],
  break: [{ freq: 300, to: 60, dur: 0.16, type: "sawtooth", gain: 0.05 }, { freq: 900, to: 500, dur: 0.08, type: "square", gain: 0.03, delay: 0.05 }, { freq: 1300, to: 800, dur: 0.06, type: "square", gain: 0.025, delay: 0.1 }],
  gear: [523, 784, 1047, 1568].map((f, i) => ({ freq: f, dur: 0.11, type: "triangle" as const, gain: 0.05, delay: i * 0.06 })),
  levelup: [392, 523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.14, type: "square" as const, gain: 0.045, delay: i * 0.07 })),
  drain: [{ freq: 160, to: 70, dur: 0.2, type: "sine", gain: 0.06 }],
  descend: [{ freq: 400, to: 120, dur: 0.4, type: "triangle", gain: 0.06 }],
  potion: [{ freq: 500, to: 900, dur: 0.15, type: "sine", gain: 0.05 }],
  nightVision: [{ freq: 220, to: 880, dur: 0.5, type: "sine", gain: 0.06 }],
  dark: [{ freq: 200, to: 40, dur: 0.9, type: "sawtooth", gain: 0.06 }],
  extract: [523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.12, type: "square" as const, gain: 0.04, delay: i * 0.08 })),
  buy: [{ freq: 700, to: 1000, dur: 0.08, type: "square", gain: 0.035 }],
  burn: [{ freq: 120, to: 50, dur: 0.35, type: "sawtooth", gain: 0.04 }],
  mint: [392, 523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.16, type: "triangle" as const, gain: 0.06, delay: i * 0.09 })),
};

export function playSfx(name: keyof typeof CUES, muted: boolean) {
  if (muted) return;
  const cues = CUES[name];
  if (!cues) return;
  try {
    const ctx = audioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    for (const c of cues) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + (c.delay ?? 0);
      osc.type = c.type ?? "square";
      osc.frequency.setValueAtTime(c.freq, t);
      if (c.to) osc.frequency.exponentialRampToValueAtTime(c.to, t + c.dur);
      gain.gain.setValueAtTime(c.gain ?? 0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + c.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(t);
      osc.stop(t + c.dur + 0.02);
    }
  } catch {
    // Audio is optional; some browsers block it until a gesture.
  }
}
