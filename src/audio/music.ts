import { audioContext } from "./context";

/** Original score written for Emberdeep. No recordings, samples, downloads or third-party melodies. */
export const MUSIC_TITLE = "Lanterns Below";
export const MUSIC_BEAT = 60/66;
const MELODY: readonly (number | null)[] = [
  62,null,65,69, 67,65,62,null, 65,69,72,69, 67,null,64,60,
  62,65,69,null, 70,69,65,62, 67,65,62,60, 61,null,64,69,
  74,null,69,65, 67,70,69,null, 72,69,65,64, 67,64,60,null,
  65,69,74,72, 70,null,69,65, 67,62,65,64, 61,64,69,null,
];
const BASS = [38,34,41,36,38,34,43,33];
export type MusicVoice = { osc: OscillatorNode; gain: GainNode };
const frequency = (midi: number) => 440*2**((midi-69)/12);

/** Shared by the real-time player and the offline audio QA. At most a bell and two soft bass tones per beat. */
export function scheduleMusicBeat(ctx: BaseAudioContext, output: AudioNode, beat: number, at: number): MusicVoice[] {
  const voices: MusicVoice[] = [];
  const note = (midi: number, duration: number, peak: number, type: OscillatorType) => {
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency(midi),at);
    gain.gain.setValueAtTime(0.0001,at);
    gain.gain.linearRampToValueAtTime(peak,at+0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001,at+duration);
    osc.connect(gain).connect(output);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
    osc.start(at);osc.stop(at+duration+0.03);voices.push({osc,gain});
  };
  const melody=MELODY[beat%MELODY.length];
  if(melody!==null)note(melody,MUSIC_BEAT*1.2,0.065,"triangle");
  if(beat%4===0) {
    const root=BASS[Math.floor(beat/4)%BASS.length];
    note(root,MUSIC_BEAT*3.7,0.045,"sine");
    note(root+7,MUSIC_BEAT*3.2,0.018,"sine");
  }
  return voices;
}

/** One small look-ahead timer, independent of the render loop. Stops and releases every voice when muted/hidden. */
export class MusicPlayer {
  private getContext: () => AudioContext;
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<MusicVoice>();
  private generation = 0;
  private starting = false;
  private nextAt = 0;
  private beat = 0;
  constructor(getContext: () => AudioContext = audioContext) { this.getContext=getContext; }
  get playing() { return this.timer!==null; }
  get activeVoices() { return this.voices.size; }

  async start() {
    if(this.timer!==null||this.starting)return;
    const generation=++this.generation;this.starting=true;
    try {
      const ctx=this.getContext();this.ctx=ctx;
      await ctx.resume();
      if(generation!==this.generation||ctx.state!=="running")return;
      if(!this.output){this.output=ctx.createGain();this.output.connect(ctx.destination);}
      this.output.gain.cancelScheduledValues(ctx.currentTime);
      this.output.gain.setValueAtTime(0.16,ctx.currentTime);
      this.nextAt=ctx.currentTime+0.04;
      this.tick();this.timer=setInterval(()=>this.tick(),100);
    } catch {
      // Audio is optional. A later gesture can retry a blocked or unavailable context.
    } finally { if(generation===this.generation)this.starting=false; }
  }

  private tick() {
    const ctx=this.ctx,output=this.output;if(!ctx||!output||ctx.state!=="running")return;
    // Never catch up a throttled/background timer by scheduling a burst of old notes.
    if(this.nextAt<ctx.currentTime)this.nextAt=ctx.currentTime+0.04;
    while(this.nextAt<ctx.currentTime+0.2) {
      for(const voice of scheduleMusicBeat(ctx,output,this.beat,this.nextAt)) {
        this.voices.add(voice);
        voice.osc.addEventListener("ended",()=>this.voices.delete(voice),{once:true});
      }
      this.beat=(this.beat+1)%MELODY.length;this.nextAt+=MUSIC_BEAT;
    }
  }

  stop() {
    ++this.generation;this.starting=false;
    if(this.timer!==null)clearInterval(this.timer);this.timer=null;
    const now=this.ctx?.currentTime??0;
    if(this.output) {
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setTargetAtTime(0,now,0.01);
    }
    for(const voice of this.voices)try{voice.osc.stop(now+0.04);}catch{voice.osc.disconnect();voice.gain.disconnect();}
    this.voices.clear();
  }
}
export const soundtrack = new MusicPlayer();
