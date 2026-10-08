/** One game tile in logical pixels, as in renderer.ts (not imported, to keep the renderer free to import this file). */
const TILE = 32;

/**
 * Short effects drawn over the cave, all in tile coordinates and all fading out on their own: the arc of the delver's
 * blow, numbers rising from what was hit, a puff where something broke or fell, and the burst where a creature's blow
 * landed. They only decorate what the game state already says happened.
 */
export type Fx =
  | { kind: "slash"; x: number; y: number; dx: number; dy: number; at: number }
  | { kind: "text"; x: number; y: number; text: string; color: string; at: number }
  | { kind: "puff"; x: number; y: number; color: string; at: number }
  | { kind: "impact"; x: number; y: number; at: number };

const LIFE: Record<Fx["kind"], number> = { slash: 220, text: 750, puff: 340, impact: 240 };

const ease = (k: number) => 1 - (1 - k) * (1 - k);

export class FxQueue {
  private list: Fx[] = [];

  add(fx: Fx) {
    this.list.push(fx);
    if (this.list.length > 80) this.list.shift();
  }

  clear() {
    this.list = [];
  }

  /**
   * Draws the live effects and forgets the finished ones. An effect whose `at` is still ahead waits for it. With reduced
   * motion, numbers stay put and nothing sweeps.
   */
  draw(ctx: CanvasRenderingContext2D, time: number, still: boolean) {
    this.list = this.list.filter(fx => time - fx.at < LIFE[fx.kind]);
    for (const fx of this.list) {
      if (time < fx.at) continue;
      const k = Math.min(1, (time - fx.at) / LIFE[fx.kind]);
      const cx = fx.x * TILE + TILE / 2, cy = fx.y * TILE + TILE / 2;
      ctx.save();
      switch (fx.kind) {
        case "slash": {
          if (still) break;
          // A bright crescent swept across the tile that was struck, turned toward the blow.
          const facing = Math.atan2(fx.dy, fx.dx);
          const sweep = ease(Math.min(1, k * 1.6));
          const from = facing - 1.25, to = from + 2.5 * sweep;
          ctx.globalAlpha = 1 - k;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(cx - fx.dx * 6, cy - fx.dy * 6, 13, from, to); ctx.stroke();
          ctx.strokeStyle = "#ccff00";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(cx - fx.dx * 6, cy - fx.dy * 6, 16, from, to); ctx.stroke();
          break;
        }
        case "text": {
          const rise = still ? 0 : Math.round(ease(k) * 14);
          ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
          ctx.font = "8px Silkscreen, monospace";
          ctx.textAlign = "center";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#0b0912";
          ctx.strokeText(fx.text, cx, cy - 18 - rise);
          ctx.fillStyle = fx.color;
          ctx.fillText(fx.text, cx, cy - 18 - rise);
          break;
        }
        case "puff": {
          // Bits flying outward from where it was.
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = fx.color;
          const r = 3 + ease(k) * 12;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + 0.3;
            const s = i % 2 ? 3 : 2;
            ctx.fillRect(Math.round(cx + Math.cos(a) * r - s / 2), Math.round(cy + Math.sin(a) * r - s / 2), s, s);
          }
          break;
        }
        case "impact": {
          // A red burst on a tile a creature's blow just hit.
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.strokeStyle = "#ff4a2a";
          ctx.lineWidth = 2;
          const r0 = 3 + k * 4, r1 = 9 + k * 6;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + (i * Math.PI) / 2;
            ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
            ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          }
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }
}
