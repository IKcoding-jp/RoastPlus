import { describe, expect, it, vi } from 'vitest';

import { playWorkChime, unlockWorkChimeAudio } from './workChimeAudio';

type AudioContextMock = NonNullable<Parameters<typeof playWorkChime>[1]['audioContext']>;

function createAudioContextMock(options: Partial<Pick<AudioContext, 'state' | 'resume'>> = {}) {
  const events: Array<{ frequency: number; start: number; stop: number; type: OscillatorType }> = [];
  const gainValues: number[] = [];

  const destination = {} as AudioDestinationNode;

  const createOscillator = vi.fn(() => {
    const oscillator = {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime: vi.fn((frequency: number) => {
          events.push({ frequency, start: 0, stop: 0, type: oscillator.type });
        }),
      },
      detune: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn((start: number) => {
        events[events.length - 1].start = start;
      }),
      stop: vi.fn((stop: number) => {
        events[events.length - 1].stop = stop;
      }),
    } as unknown as OscillatorNode;

    return oscillator;
  });

  const createGain = vi.fn(
    () =>
      ({
        gain: {
          setValueAtTime: vi.fn((value: number) => gainValues.push(value)),
          exponentialRampToValueAtTime: vi.fn((value: number) => gainValues.push(value)),
        },
        connect: vi.fn(),
      }) as unknown as GainNode
  );

  const ctx: AudioContextMock = {
    currentTime: 10,
    destination,
    createOscillator,
    createGain,
    ...options,
  };

  return {
    ctx,
    events,
    gainValues,
  };
}

describe('workChimeAudio', () => {
  it('休憩チャイムは下がる2音をスケジュールする', () => {
    const mock = createAudioContextMock();

    playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(6);
    expect(mock.events[0].frequency).toBe(784);
    expect(mock.events[3].frequency).toBe(659);
  });

  it('作業開始チャイムは上がる3音をスケジュールする', () => {
    const mock = createAudioContextMock();

    playWorkChime('work-start', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(9);
    expect(mock.events[0].frequency).toBe(659);
    expect(mock.events[3].frequency).toBe(784);
    expect(mock.events[6].frequency).toBe(988);
  });

  it('音量は0から1に丸める', () => {
    const low = createAudioContextMock();
    const high = createAudioContextMock();

    playWorkChime('break', { volume: -1, audioContext: low.ctx });
    playWorkChime('break', { volume: 2, audioContext: high.ctx });

    expect(low.gainValues).toContain(0);
    expect(high.gainValues.some((value) => value > 1)).toBe(false);
  });

  it('停止中のAudioContextを再開してからチャイムをスケジュールする', () => {
    const resume = vi.fn(() => Promise.resolve());
    const mock = createAudioContextMock({ state: 'suspended', resume });

    playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.ctx.createOscillator).toHaveBeenCalled();
  });

  it('音声有効化時にAudioContextを作成して無音チャイムで初期化する', () => {
    const resume = vi.fn(() => Promise.resolve());
    const mock = createAudioContextMock({ state: 'suspended', resume });
    const AudioContextMockConstructor = vi.fn(function AudioContextMock() {
      return mock.ctx;
    });
    const originalAudioContext = window.AudioContext;

    Object.defineProperty(window, 'AudioContext', {
      value: AudioContextMockConstructor as unknown as typeof AudioContext,
      configurable: true,
    });

    const didUnlock = unlockWorkChimeAudio();

    expect(didUnlock).toBe(true);
    expect(AudioContextMockConstructor).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.gainValues).toContain(0);

    Object.defineProperty(window, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
    });
  });
});
