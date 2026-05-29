import { describe, it, expect, vi } from 'vitest';
import { playDripCountdownAudio } from './countdownAudio';

function createMockContext(state: AudioContextState = 'running') {
  const startTimes: number[] = [];
  const ctx = {
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    state,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => ({
      type: '' as OscillatorType,
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn((t: number) => { startTimes.push(t); }),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
  };
  return { ctx, startTimes };
}

describe('playDripCountdownAudio', () => {
  it('ポン×3・ピーン×2の計5オシレーターを正しいタイミングでスケジュールする', async () => {
    const { ctx, startTimes } = createMockContext();

    const result = await playDripCountdownAudio({
      volume: 0.5,
      audioContext: ctx as never,
    });

    expect(result).toBe(true);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(5);
    expect(startTimes[0]).toBeCloseTo(0.05, 2);  // ポン1 (t+0+offset)
    expect(startTimes[1]).toBeCloseTo(1.05, 2);  // ポン2 (t+1+offset)
    expect(startTimes[2]).toBeCloseTo(2.05, 2);  // ポン3 (t+2+offset)
    expect(startTimes[3]).toBeCloseTo(3.05, 2);  // ピーン main (t+3+offset)
    expect(startTimes[4]).toBeCloseTo(3.05, 2);  // ピーン overtone (t+3+offset)
  });

  it('AudioContext が suspended のとき resume() を呼ぶ', async () => {
    const { ctx } = createMockContext('suspended');

    await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(ctx.resume).toHaveBeenCalledOnce();
  });

  it('resume() が失敗したとき false を返す', async () => {
    const { ctx } = createMockContext('suspended');
    ctx.resume.mockRejectedValue(new Error('NotAllowedError'));

    const result = await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(result).toBe(false);
  });

  it('例外が起きても false を返す（throw しない）', async () => {
    const { ctx } = createMockContext();
    ctx.createGain.mockImplementation(() => { throw new Error('AudioError'); });

    const result = await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(result).toBe(false);
  });
});
