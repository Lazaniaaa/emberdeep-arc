/** The animals a delver can be. A new player gets one at random, kept in the save. */
export const ANIMALS = [
  "cat-ginger-tabby", "cat-maine-coon", "cat-scottish-fold", "cat-siamese",
  "dog-shiba", "dog-corgi", "dog-husky", "dog-beagle",
] as const;
export type Animal = (typeof ANIMALS)[number];

export const ANIMAL_NAMES: Record<Animal, string> = {
  "cat-ginger-tabby": "Ginger tabby", "cat-maine-coon": "Maine Coon", "cat-scottish-fold": "Scottish Fold", "cat-siamese": "Siamese",
  "dog-shiba": "Shiba", "dog-corgi": "Corgi", "dog-husky": "Husky", "dog-beagle": "Beagle",
};

export const isAnimal = (v: unknown): v is Animal => typeof v === "string" && (ANIMALS as readonly string[]).includes(v);

/** A new delver's animal, drawn at random. */
export const randomAnimal = (random: () => number = Math.random): Animal => ANIMALS[Math.floor(random() * ANIMALS.length) % ANIMALS.length];
