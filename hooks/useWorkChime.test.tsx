import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkChime } from './useWorkChime';

const playWorkChimeMock = vi.fn();
const unlockWorkChimeAudioMock = vi.fn(() => Promise.resolve(true));
const resumeWorkChimeAudioMock = vi.fn(() => Promise.resolve(true));
const isWorkChimeAudioReadyMock = vi.fn(() => true);

vi.mock('@/lib/workChimeAudio', () => ({
  isWorkChimeAudioReady: () => isWorkChimeAudioReadyMock(),
  playWorkChime: (...args: unknown[]) => playWorkChimeMock(...args),
  unlockWorkChimeAudio: () => unlockWorkChimeAudioMock(),
  resumeWorkChimeAudio: () => resumeWorkChimeAudioMock(),
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
    playWorkChimeMock.mockResolvedValue(true);
    unlockWorkChimeAudioMock.mockReset();
    unlockWorkChimeAudioMock.mockResolvedValue(true);
    resumeWorkChimeAudioMock.mockReset();
    resumeWorkChimeAudioMock.mockResolvedValue(true);
    isWorkChimeAudioReadyMock.mockReset();
    isWorkChimeAudioReadyMock.mockReturnValue(true);
  });

  it('音の有効化前（AudioContext未準備）は鳴らさず通知だけ表示する', () => {
    isWorkChimeAudioReadyMock.mockReturnValue(false);

    const { result } = renderHook(() => useWorkChime(localDate(10, 45)));

    expect(playWorkChimeMock).not.toHaveBeenCalled();
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('アンロック後に該当時刻で音を鳴らして通知を表示する', async () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });

    playWorkChimeMock.mockClear();

    rerender({ now: localDate(10, 45) });
    await act(async () => {
      await Promise.resolve();
    });

    expect(playWorkChimeMock).toHaveBeenCalledWith('break', { volume: 0.8 });
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('現在の時間帯を返す', () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    expect(result.current.currentPeriod?.period.id).toBe('work-1');
    expect(result.current.currentPeriod?.label).toBe('作業中');
    expect(result.current.currentPeriod?.minutesUntilEnd).toBe(5);
  });

  it('同じ分では重複再生しない', async () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });

    playWorkChimeMock.mockClear();

    rerender({ now: localDate(10, 45) });
    rerender({ now: localDate(10, 45, 40) });
    await act(async () => {
      await Promise.resolve();
    });

    expect(playWorkChimeMock).toHaveBeenCalledTimes(1);
  });

  it('PWA復帰などで区切り時刻の秒をまたいでも通知を表示する', () => {
    isWorkChimeAudioReadyMock.mockReturnValue(false);

    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    rerender({ now: localDate(10, 45, 3) });

    expect(playWorkChimeMock).not.toHaveBeenCalled();
    expect(result.current.activeChime?.label).toBe('休憩開始');
    expect(result.current.activeChime?.message).toBe('休憩時間です');
  });

  it('5秒後に通知を消す', async () => {
    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });

    rerender({ now: localDate(10, 45) });
    expect(result.current.activeChime).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.activeChime).toBeNull();
  });

  it('テスト用チャイムは通知を表示して音を鳴らす', async () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    await act(async () => {
      result.current.testWorkChime('work-start');
      await Promise.resolve();
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

  it('復帰時にAudioContextを再開できれば音の有効化を維持する', async () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });
    expect(result.current.isAudioEnabled).toBe(true);

    // iOS で suspended/interrupted になった想定。focus で resume を試みて成功する。
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    resumeWorkChimeAudioMock.mockResolvedValue(true);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(resumeWorkChimeAudioMock).toHaveBeenCalled();
    expect(result.current.isAudioEnabled).toBe(true);
  });

  it('復帰時にAudioContextを再開できなければ音の有効化を解除する', async () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });
    expect(result.current.isAudioEnabled).toBe(true);

    // resume が失敗（suspended でユーザー操作が必要）した想定。
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    resumeWorkChimeAudioMock.mockResolvedValue(false);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(result.current.isAudioEnabled).toBe(false);
  });

  it('画面上のユーザー操作（pointerdown）でオーディオを自動有効化する', async () => {
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    unlockWorkChimeAudioMock.mockResolvedValue(true);

    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));
    expect(result.current.isAudioEnabled).toBe(false);

    await act(async () => {
      document.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });

    expect(unlockWorkChimeAudioMock).toHaveBeenCalled();
    expect(result.current.isAudioEnabled).toBe(true);
  });
});
