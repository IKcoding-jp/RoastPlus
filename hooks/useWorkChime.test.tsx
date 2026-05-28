import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkChime } from './useWorkChime';

const playWorkChimeMock = vi.fn();
const unlockWorkChimeAudioMock = vi.fn(() => true);

vi.mock('@/lib/workChimeAudio', () => ({
  playWorkChime: (...args: unknown[]) => playWorkChimeMock(...args),
  unlockWorkChimeAudio: () => unlockWorkChimeAudioMock(),
}));

const createLocalStorageMock = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

const localDate = (hour: number, minute: number, second = 0) => new Date(2026, 4, 17, hour, minute, second);

describe('useWorkChime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', createLocalStorageMock());
    playWorkChimeMock.mockReset();
    unlockWorkChimeAudioMock.mockReset();
    unlockWorkChimeAudioMock.mockReturnValue(true);
  });

  it('音の有効化前でも該当時刻は通知を表示する', () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 45)));

    expect(playWorkChimeMock).not.toHaveBeenCalled();
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('アンロック後に該当時刻で音を鳴らして通知を表示する', () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    act(() => {
      result.current.enableAudio();
    });

    playWorkChimeMock.mockClear();

    rerender({ now: localDate(10, 45) });

    expect(playWorkChimeMock).toHaveBeenCalledWith('break', { volume: 0.8 });
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('現在の時間帯を返す', () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    expect(result.current.currentPeriod?.period.id).toBe('work-1');
    expect(result.current.currentPeriod?.label).toBe('作業中');
    expect(result.current.currentPeriod?.minutesUntilEnd).toBe(5);
  });

  it('同じ分では重複再生しない', () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    act(() => {
      result.current.enableAudio();
    });

    playWorkChimeMock.mockClear();

    rerender({ now: localDate(10, 45) });
    rerender({ now: localDate(10, 45, 40) });

    expect(playWorkChimeMock).toHaveBeenCalledTimes(1);
  });

  it('PWA復帰などで区切り時刻の秒をまたいでも通知を表示する', () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    rerender({ now: localDate(10, 45, 3) });

    expect(playWorkChimeMock).not.toHaveBeenCalled();
    expect(result.current.activeChime?.label).toBe('休憩開始');
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('5秒後に通知を消す', () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    act(() => {
      result.current.enableAudio();
    });

    rerender({ now: localDate(10, 45) });
    expect(result.current.activeChime).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.activeChime).toBeNull();
  });

  it('テスト用チャイムは通知を表示して音を鳴らす', () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    act(() => {
      result.current.testWorkChime('work-start');
    });

    expect(playWorkChimeMock).toHaveBeenCalledWith('work-start', { volume: 0.8 });
    expect(result.current.isAudioEnabled).toBe(true);
    expect(result.current.activeChime?.label).toBe('作業開始');
    expect(result.current.activeChime?.message).toBe('作業開始です');
  });

  it('テスト用チャイムも5秒後に通知を消す', () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    act(() => {
      result.current.testWorkChime('break');
    });

    expect(result.current.activeChime).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.activeChime).toBeNull();
  });
});
