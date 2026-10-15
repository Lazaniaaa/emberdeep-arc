import { afterEach, describe, expect, it, vi } from "vitest";
import { MusicPlayer } from "./music";

function audio() {
  const voices: {stop: ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>}[]=[];
  const parameter=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),setTargetAtTime:vi.fn()});
  const ctx={currentTime:0,state:"running",destination:{},resume:vi.fn(async()=>{}),
    createGain:vi.fn(()=>({gain:parameter(),connect:vi.fn(function(this:unknown){return this;}),disconnect:vi.fn()})),
    createOscillator:vi.fn(()=>{
      const node={frequency:parameter(),type:"sine",connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),addEventListener:vi.fn()};
      node.connect.mockImplementation(()=>ctx.createGain());voices.push(node);return node;
    }),
  };
  return {ctx,voices,get:()=>ctx as unknown as AudioContext};
}
afterEach(()=>vi.useRealTimers());
describe("original soundtrack lifecycle",()=>{
  it("uses one scheduler across repeated starts and stops every active tone on mute",async()=>{
    vi.useFakeTimers();const a=audio(),player=new MusicPlayer(a.get);
    await Promise.all([player.start(),player.start()]);
    expect(player.playing).toBe(true);expect(vi.getTimerCount()).toBe(1);
    expect(player.activeVoices).toBeGreaterThan(0);
    await player.start();expect(vi.getTimerCount()).toBe(1);
    player.stop();expect(player.playing).toBe(false);expect(player.activeVoices).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    for(const voice of a.voices)expect(voice.stop).toHaveBeenCalledWith(0.04);
  });
  it("does not burst through missed notes after a throttled timer",async()=>{
    vi.useFakeTimers();const a=audio(),player=new MusicPlayer(a.get);await player.start();
    const count=a.voices.length;a.ctx.currentTime=600;vi.advanceTimersByTime(100);
    expect(a.voices.length-count).toBeLessThanOrEqual(3);player.stop();
  });
  it("cannot restart after being stopped while audio unlock is pending",async()=>{
    vi.useFakeTimers();const a=audio();let resume=()=>{};
    a.ctx.resume.mockImplementation(()=>new Promise<void>(resolve=>{resume=resolve;}));
    const player=new MusicPlayer(a.get),pending=player.start();player.stop();resume();await pending;
    expect(player.playing).toBe(false);expect(a.voices).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
  });
  it("handles denied audio without a timer or an unhandled rejection, and can retry",async()=>{
    vi.useFakeTimers();const a=audio();a.ctx.resume.mockRejectedValueOnce(new Error("autoplay denied"));
    const player=new MusicPlayer(a.get);await player.start();expect(player.playing).toBe(false);
    await player.start();expect(player.playing).toBe(true);player.stop();
  });
});
