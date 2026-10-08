/**
 * Sprite sheets loaded as images (public/heroes, public/mobs), with one-colour copies made on demand for the flash of a
 * blow: red when the delver is hit, white when a creature is.
 */
type Loaded = { image: HTMLImageElement; tints: Map<string, HTMLCanvasElement> };
const loaded = new Map<string, Loaded>();

export type Sheet = {
  image: HTMLImageElement;
  /** The whole sheet in one colour, the shape of every frame kept. */
  tint: (color: string) => HTMLCanvasElement;
};

/** A sheet by its path under the site's base, or null while it is still loading. The first call starts the load. */
export function loadSheet(path: string): Sheet | null {
  let entry = loaded.get(path);
  if (!entry) {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}${path}`;
    entry = { image, tints: new Map() };
    loaded.set(path, entry);
  }
  const { image, tints } = entry;
  if (!image.complete || image.naturalWidth === 0) return null;
  return {
    image,
    tint: color => {
      let canvas = tints.get(color);
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        tints.set(color, canvas);
      }
      return canvas;
    },
  };
}
