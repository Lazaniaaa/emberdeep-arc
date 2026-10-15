/** Music and effects share one context; browsers unlock it after a user gesture. */
let context: AudioContext | null = null;
export function audioContext() {
  if (!context || context.state === "closed") context = new AudioContext();
  return context;
}
