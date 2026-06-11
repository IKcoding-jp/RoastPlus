import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkChime } from './useWorkChime';

const playWorkChimeMock = vi.fn();
const unlockWorkChimeAudioMock = vi.fn(() => Promise.resolve(true));
const reviveWorkChimeAudioMock = vi.fn(() => Promise.resolve(true));
const markWorkChimeAudioSuspectMock = vi.fn();
const isWorkChimeAudioReadyMock = vi.fn(() => true);

vi.mock('@/lib/workChimeAudio', () => ({
  isWorkChimeAudioReady: () => isWorkChimeAudioReadyMock(),
  markWorkChimeAudioSuspect: () => markWorkChimeAudioSuspectMock(),
  playWorkChime: (...args: unknown[]) => playWorkChimeMock(...args),
  unlockWorkChimeAudio: () => unlockWorkChimeAudioMock(),
  reviveWorkChimeAudio: () => reviveWorkChimeAudioMock(),
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
    reviveWorkChimeAudioMock.mockReset();
    reviveWorkChimeAudioMock.mockResolvedValue(true);
    markWorkChimeAudioSuspectMock.mockReset();
    isWorkChimeAudioReadyMock.mockReset();
    isWorkChimeAudioReadyMock.mockReturnValue(true);
  });

  it('音の有効化前（AudioContext未準備）は鳴らさず通知だけ表示する', async () => {
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    // 未アンロックなので復旧もできない。
    reviveWorkChimeAudioMock.mockResolvedValue(false);

    const { result } = renderHook(() => useWorkChime(localDate(10, 45)));

    await act(async () => {
      await Promise.resolve();
    });

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

  it('PWA復帰などで区切り時刻の秒をまたいでも通知を表示する', async () => {
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    reviveWorkChimeAudioMock.mockResolvedValue(false);

    const { result, rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    rerender({ now: localDate(10, 45, 3) });

    await act(async () => {
      await Promise.resolve();
    });

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

  it('復帰時にAudioContextを復旧できれば音の有効化を維持する', async () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });
    expect(result.current.isAudioEnabled).toBe(true);

    // iOS で suspended/interrupted になった想定。focus で復旧を試みて成功する。
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    reviveWorkChimeAudioMock.mockResolvedValue(true);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(reviveWorkChimeAudioMock).toHaveBeenCalled();
    expect(result.current.isAudioEnabled).toBe(true);
  });

  it('復帰時にAudioContextを復旧できなければ音の有効化を解除する', async () => {
    const { result } = renderHook(() => useWorkChime(localDate(10, 40)));

    await act(async () => {
      result.current.enableAudio();
      await Promise.resolve();
    });
    expect(result.current.isAudioEnabled).toBe(true);

    // 復旧失敗（suspended でユーザー操作が必要、または復帰不能）の想定。
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    reviveWorkChimeAudioMock.mockResolvedValue(false);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(result.current.isAudioEnabled).toBe(false);
  });

  it('stateがreadyを報告していても復帰時は必ず実測プローブで生存確認する', async () => {
    renderHook(() => useWorkChime(localDate(10, 40)));

    // iPadOS WebKit のゾンビ状態は state='running'（ready=true）を報告するため、
    // ready 判定を理由に復旧をスキップしてはいけない（本バグの回帰テスト）。
    isWorkChimeAudioReadyMock.mockReturnValue(true);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(markWorkChimeAudioSuspectMock).toHaveBeenCalled();
    expect(reviveWorkChimeAudioMock).toHaveBeenCalled();
  });

  it('非表示への遷移（visibilityState=hidden）では復旧処理を行わない', async () => {
    renderHook(() => useWorkChime(localDate(10, 40)));

    const originalVisibilityState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    try {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      expect(reviveWorkChimeAudioMock).not.toHaveBeenCalled();
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState;
      if (originalVisibilityState) {
        Object.defineProperty(Document.prototype, 'visibilityState', originalVisibilityState);
      }
    }
  });

  it('復帰直後の生存確認中にチャイム時刻をまたいだ場合、復旧できたら遅れて鳴らす', async () => {
    // 復帰直後で ready=false（suspect 中）、復旧は成功する想定。
    isWorkChimeAudioReadyMock.mockReturnValue(false);
    reviveWorkChimeAudioMock.mockResolvedValue(true);

    const { rerender } = renderHook(({ now }) => useWorkChime(now), {
      initialProps: { now: localDate(10, 44, 59) },
    });

    rerender({ now: localDate(10, 45) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(reviveWorkChimeAudioMock).toHaveBeenCalled();
    expect(playWorkChimeMock).toHaveBeenCalledWith('break', { volume: 0.8 });
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
