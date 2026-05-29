declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type AudioContextLike = Pick<
  AudioContext,
  'currentTime' | 'destination' | 'createOscillator' | 'createGain'
> & Partial<Pick<AudioContext, 'state' | 'resume'>>;

interface PlayDripCountdownOptions {
  volume: number;
  audioContext?: AudioContextLike;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

let dripCountdownAudioContext: AudioContextLike | null = null;

function createAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return new AudioContextConstructor();
}

function getAudioContext(): AudioContextLike | null {
  if (dripCountdownAudioContext) return dripCountdownAudioContext;
  dripCountdownAudioContext = createAudioContext();
  return dripCountdownAudioContext;
}

async function resumeAudioContext(ctx: AudioContextLike): Promise<boolean> {
  if (ctx.state === 'closed') return false;
  if (ctx.state !== 'suspended') return true;
  if (!ctx.resume) return false;
  try {
    await ctx.resume();
    return true;
  } catch (error) {
    console.warn('Failed to resume drip countdown audio:', error);
    return false;
  }
}

function tone(
  ctx: AudioContextLike,
  master: GainNode,
  start: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  release: number
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + 0.010);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur + release);
  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + dur + release + 0.05);
}

async function scheduleCountdown(ctx: AudioContextLike, volume: number): Promise<boolean> {
  const isReady = await resumeAudioContext(ctx);
  if (!isReady) return false;

  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, ctx.currentTime);
  master.connect(ctx.destination);

  const now = ctx.currentTime + 0.05;

  // ポン × 3（t+0, t+1, t+2）
  for (let i = 0; i < 3; i++) {
    tone(ctx, master, now + i, 370, 0.07, 'triangle', 0.20, 0.10);
  }

  // ピーン！（t+3）: main + overtone
  tone(ctx, master, now + 3, 1046.5, 0.28, 'sine', 0.28, 0.60);
  tone(ctx, master, now + 3, 1046.5 * 2.01, 0.14, 'sine', 0.0504, 0.36);

  return true;
}

export function isDripCountdownAudioReady(): boolean {
  if (!dripCountdownAudioContext) return false;
  return (
    dripCountdownAudioContext.state !== 'suspended' &&
    dripCountdownAudioContext.state !== 'closed'
  );
}

export async function playDripCountdownAudio(options: PlayDripCountdownOptions): Promise<boolean> {
  const ctx = options.audioContext ?? getAudioContext();
  if (!ctx) return false;

  try {
    return await scheduleCountdown(ctx, clampVolume(options.volume));
  } catch (error) {
    console.warn('Failed to play drip countdown audio:', error);
    return false;
  }
}
