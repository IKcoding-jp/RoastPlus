import type { WorkChimeKind } from './workChime';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type AudioContextLike = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'> &
  Partial<Pick<AudioContext, 'state' | 'resume'>>;

interface PlayWorkChimeOptions {
  volume: number;
  audioContext?: AudioContextLike;
}

interface ToneOptions {
  start: number;
  frequency: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  release?: number;
  detune?: number;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

let workChimeAudioContext: AudioContextLike | null = null;

function createAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  return new AudioContextConstructor();
}

function getAudioContext(): AudioContextLike | null {
  if (workChimeAudioContext) return workChimeAudioContext;

  workChimeAudioContext = createAudioContext();
  return workChimeAudioContext;
}

async function resumeAudioContext(ctx: AudioContextLike): Promise<boolean> {
  if (ctx.state === 'closed') return false;
  if (ctx.state !== 'suspended') return true;
  if (!ctx.resume) return false;

  try {
    await ctx.resume();
    return true;
  } catch (error) {
    console.warn('Failed to resume work chime audio:', error);
    return false;
  }
}

function tone(ctx: AudioContextLike, master: GainNode, options: ToneOptions): void {
  const { start, frequency, duration, gain, type = 'sine', release = 0.32, detune = 0 } = options;

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);

  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + duration + release + 0.04);
}

function bell(
  ctx: AudioContextLike,
  master: GainNode,
  start: number,
  frequency: number,
  duration: number,
  gain: number
): void {
  tone(ctx, master, { start, frequency, duration, gain, release: 0.42 });
  tone(ctx, master, {
    start,
    frequency: frequency * 2.01,
    duration: duration * 0.62,
    gain: gain * 0.22,
    release: 0.28,
    detune: 4,
  });
  tone(ctx, master, {
    start,
    frequency: frequency * 3.01,
    duration: duration * 0.46,
    gain: gain * 0.1,
    type: 'triangle',
    release: 0.18,
    detune: -3,
  });
}

async function scheduleWorkChime(ctx: AudioContextLike, kind: WorkChimeKind, volume: number): Promise<boolean> {
  const isReady = await resumeAudioContext(ctx);
  if (!isReady) return false;

  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, ctx.currentTime);
  master.connect(ctx.destination);

  const now = ctx.currentTime + 0.05;

  if (kind === 'break') {
    bell(ctx, master, now, 784, 0.18, 0.34);
    bell(ctx, master, now + 0.26, 659, 0.28, 0.3);
    return true;
  }

  bell(ctx, master, now, 659, 0.14, 0.3);
  bell(ctx, master, now + 0.21, 784, 0.14, 0.32);
  bell(ctx, master, now + 0.42, 988, 0.22, 0.28);
  return true;
}

export function isWorkChimeAudioReady(): boolean {
  if (!workChimeAudioContext) return false;
  return workChimeAudioContext.state !== 'suspended' && workChimeAudioContext.state !== 'closed';
}

export async function unlockWorkChimeAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    return await scheduleWorkChime(ctx, 'work-start', 0);
  } catch (error) {
    console.warn('Failed to unlock work chime audio:', error);
    return false;
  }
}

export async function playWorkChime(kind: WorkChimeKind, options: PlayWorkChimeOptions): Promise<boolean> {
  const ctx = options.audioContext ?? getAudioContext();
  if (!ctx) return false;

  try {
    return await scheduleWorkChime(ctx, kind, clampVolume(options.volume));
  } catch (error) {
    console.warn('Failed to play work chime:', error);
    return false;
  }
}
