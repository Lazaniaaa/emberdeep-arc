/** Movement keys shared by the camp and the dungeon: WASD and the arrows. */
export const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
};

/**
 * The same keys by their place on the keyboard, so WASD and E work whatever the layout: on a Ukrainian one W types "ц".
 */
const MOVE_CODES: Record<string, [number, number]> = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };

/** The step a key asks for, if it is a movement key. */
export const moveOf = (e: Pick<KeyboardEvent, "key" | "code">): [number, number] | undefined => MOVE_KEYS[e.key] ?? MOVE_CODES[e.code];

/** Whether a key is E, the act key (open a building, descend, extract), in any layout. */
export const isActKey = (e: Pick<KeyboardEvent, "key" | "code">) => e.code === "KeyE" || e.key === "e" || e.key === "E";

/** Minimum gap between repeated steps while a key is held. */
export const MOVE_MS = 90;
