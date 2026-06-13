// assignment 移行(1/4): 購読・保存のエラー通知基盤テスト
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSyncedSubscription, runWriteWithSync } from './sync';
import {
  getSyncError,
  getSaveError,
  clearSyncError,
  clearSaveError,
  reportSyncError,
  reportSaveError,
} from '@/lib/syncStatus';

describe('createSyncedSubscription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearSyncError();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearSyncError();
  });

  it('成功スナップショットを onData に渡し、同期エラーを解除する', () => {
    reportSyncError('unavailable'); // 事前にエラーが残っている状態
    const onData = vi.fn();

    createSyncedSubscription<string>((onNext) => {
      onNext('snap-1');
      return () => {};
    }, onData);

    expect(onData).toHaveBeenCalledWith('snap-1');
    expect(getSyncError()).toBeNull();
  });

  it('購読失敗で reportSyncError を呼び、バックオフ後に再購読する', () => {
    let attachCount = 0;
    let lastOnError: (error: { code?: string }) => void = () => {};

    createSyncedSubscription<string>((_onNext, onError) => {
      attachCount += 1;
      lastOnError = onError;
      return () => {};
    }, vi.fn());

    expect(attachCount).toBe(1);

    lastOnError({ code: 'unavailable' });
    expect(getSyncError()).toBe('unavailable');

    // 1 回目のバックオフ（1000ms 起点）で再購読される
    vi.advanceTimersByTime(1000);
    expect(attachCount).toBe(2);
  });

  it('解除後は再購読タイマーが発火せず、同期エラーも解除する', () => {
    let attachCount = 0;
    let lastOnError: (error: { code?: string }) => void = () => {};
    const unsubscribe = vi.fn();

    const stop = createSyncedSubscription<string>((_onNext, onError) => {
      attachCount += 1;
      lastOnError = onError;
      return unsubscribe;
    }, vi.fn());

    lastOnError({ code: 'unavailable' });
    stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(getSyncError()).toBeNull();

    vi.advanceTimersByTime(60_000);
    expect(attachCount).toBe(1); // 再購読されない
  });
});

describe('runWriteWithSync', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearSaveError();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearSaveError();
  });

  it('成功時は結果を返し、保存エラーを解除する', async () => {
    reportSaveError('unknown'); // 事前にエラーが残っている状態

    const result = await runWriteWithSync(async () => 'done');

    expect(result).toBe('done');
    expect(getSaveError()).toBeNull();
  });

  it('失敗時は reportSaveError を呼び、例外を再 throw する', async () => {
    await expect(
      runWriteWithSync(async () => {
        throw { code: 'permission-denied' };
      })
    ).rejects.toEqual({
      code: 'permission-denied',
    });
    expect(getSaveError()).toBe('permission-denied');
  });
});
