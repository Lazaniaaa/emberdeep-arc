# Rounded hero eyes — 2026-10-07

The owner requested broader, friendly eyes for the ginger tabby and husky after reviewing their game sprites.
Both edits used the built-in `image_gen` tool. Exact prompts are stored in the two `*-prompt.txt` files.
The `*-rounded-eyes.png` files are the generated outputs; `originals/` preserves the previous raw sheets.

Only the twenty visible eye regions per sheet were composited from each generated output into the previous source.
The rectangles are recorded in `eye-regions.json`. Every decoded source pixel outside those rectangles remains identical,
including the rear row, equipment, paws and tails. The merged sources are stored losslessly as
`art/heroes/raw/cat-ginger-tabby.webp` and `art/heroes/raw/dog-husky.webp`.

The normal pipeline consumes those merged sources:

```sh
node scripts/sprite-sheets.mjs heroes cat-ginger-tabby
node scripts/sprite-sheets.mjs heroes dog-husky
```

Runtime assets remain `public/heroes/cat-ginger-tabby.png` and `public/heroes/dog-husky.png`.
The other six heroes and the rendering scale are unchanged.
