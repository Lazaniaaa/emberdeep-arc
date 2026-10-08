import { describe, expect, it, vi } from "vitest";
import { drawHero } from "./mob-art";

const { image, tintImage } = vi.hoisted(() => ({ image: {}, tintImage: {} }));
vi.mock("./sheets", () => ({ loadSheet: () => ({ image, tint: () => tintImage }) }));

describe("hero drawing", () => {
  it("crops the full-resolution pose while keeping its logical size and feet, including the hit tint", () => {
    const drawImage = vi.fn();
    const ctx = {
      beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage,
    } as unknown as CanvasRenderingContext2D;
    drawHero(ctx, { animal: "dog-husky", dir: "right", frame: "s", offX: 0, offY: 0, flash: 0.5 }, 100, 100, 32, "black");
    expect(drawImage.mock.calls).toEqual([
      [image, 512, 224, 128, 112, 84, 76, 64, 56],
      [tintImage, 512, 224, 128, 112, 84, 76, 64, 56],
    ]);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });
});
