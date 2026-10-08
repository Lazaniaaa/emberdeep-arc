import { describe, expect, it } from "vitest";
import { ANIMALS, ANIMAL_NAMES, isAnimal, randomAnimal } from "./animals";

describe("animals", () => {
  it("has four cats and four dogs, each with a name", () => {
    expect(ANIMALS.filter(a => a.startsWith("cat-"))).toHaveLength(4);
    expect(ANIMALS.filter(a => a.startsWith("dog-"))).toHaveLength(4);
    for (const a of ANIMALS) expect(ANIMAL_NAMES[a].length).toBeGreaterThan(0);
  });

  it("deals every animal, and only animals", () => {
    const dealt = new Set(Array.from({ length: 80 }, (_, i) => randomAnimal(() => i / 80)));
    expect(dealt.size).toBe(ANIMALS.length);
    expect(randomAnimal(() => 0.9999999)).toBe(ANIMALS[ANIMALS.length - 1]);
    expect(isAnimal("cat-siamese")).toBe(true);
    expect(isAnimal("cat-sphynx")).toBe(false);
    expect(isAnimal(7)).toBe(false);
  });
});
