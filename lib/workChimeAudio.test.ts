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

  const compressorConnections: unknown[] = [];

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

  const createDynamicsCompressor = vi.fn(() => {
    const compressor = {
      threshold: { setValueAtTime: vi.fn() },
      knee: { setValueAtTime: vi.fn() },
      ratio: { setValueAtTime: vi.fn() },
      attack: { setValueAtTime: vi.fn() },
      release: { setValueAtTime: vi.fn() },
      connect: vi.fn((target: unknown) => compressorConnections.push(target)),
    } as unknown as DynamicsCompressorNode;

    return compressor;
  });

  const ctx: AudioContextMock = {
    currentTime: 10,
    destination,
    createOscillator,
    createGain,
    createDynamicsCompressor,
    ...options,
  };

  return {
    ctx,
    events,
    gainValues,
    destination,
    compressorConnections,
  };
}

describe('workChimeAudio', () => {
  it('休憩チャイムは下がる2音をスケジュールする', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(6);
    expect(mock.events[0].frequency).toBe(784);
    expect(mock.events[3].frequency).toBe(659);
  });

  it('作業開始チャイムは上がる3音をスケジュールする', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('work-start', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(9);
    expect(mock.events[0].frequency).toBe(659);
    expect(mock.events[3].frequency).toBe(784);
    expect(mock.events[6].frequency).toBe(988);
  });

  it('音量は0から1に丸める', async () => {
    const low = createAudioContextMock();
    const high = createAudioContextMock();

    await playWorkChime('break', { volume: -1, audioContext: low.ctx });
    await playWorkChime('break', { volume: 2, audioContext: high.ctx });

    expect(low.gainValues).toContain(0);
    expect(high.gainValues.some((value) => value > 1)).toBe(false);
  });

  it('出力リミッターを最終段に挟んでdestinationへ接続する', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createDynamicsCompressor).toHaveBeenCalledTimes(1);
    // リミッターが destination に接続される（master → limiter → destination の最終段）。
    expect(mock.compressorConnections).toContain(mock.destination);
  });

  it('createDynamicsCompressor非対応環境でもチャイムをスケジュールする', async () => {
    const mock = createAudioContextMock();
    // 旧環境を想定し compressor 非対応にする。
    (mock.ctx as { createDynamicsCompressor?: unknown }).createDynamicsCompressor = undefined;

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(6);
  });

  it('停止中のAudioContextを再開してからチャイムをスケジュールする', async () => {
    const resume = vi.fn(() => Promise.resolve());
    const mock = createAudioContextMock({ state: 'suspended', resume });

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.ctx.createOscillator).toHaveBeenCalled();
  });

  it('iOSのinterrupted状態でも再開してからチャイムをスケジュールする', async () => {
    const resume = vi.fn(() => Promise.resolve());
    // iOS 独自の 'interrupted' 状態（型上は存在しないためキャスト）。
    const mock = createAudioContextMock({
      state: 'interrupted' as AudioContextState,
      resume,
    });

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.ctx.createOscillator).toHaveBeenCalled();
  });

  it('音声有効化時にAudioContextを作成して無音チャイムで初期化する', async () => {
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

    const didUnlock = await unlockWorkChimeAudio();

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
