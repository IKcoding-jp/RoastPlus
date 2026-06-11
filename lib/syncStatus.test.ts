// Firestore購読エラーの同期状態ストアのテスト（issue #496）

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSyncError, reportSyncError, clearSyncError, subscribeSyncError } from './syncStatus';

describe('syncStatus', () => {
  beforeEach(() => {
    clearSyncError();
  });

  it('初期状態ではエラーがない（null）', () => {
    expect(getSyncError()).toBeNull();
  });

  it('reportSyncError で報告したエラー種別を取得できる', () => {
    reportSyncError('permission-denied');
    expect(getSyncError()).toBe('permission-denied');
  });

  it('reportSyncError で購読中のリスナーが呼ばれる', () => {
    const listener = vi.fn();
    subscribeSyncError(listener);

    reportSyncError('unavailable');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clearSyncError でエラーが消えてリスナーが呼ばれる', () => {
    const listener = vi.fn();
    reportSyncError('unknown');
    subscribeSyncError(listener);

    clearSyncError();

    expect(getSyncError()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('状態が変化しないときはリスナーを呼ばない（不要な再レンダー防止）', () => {
    const listener = vi.fn();
    subscribeSyncError(listener);

    clearSyncError(); // すでに null → 変化なし
    expect(listener).not.toHaveBeenCalled();

    reportSyncError('unavailable');
    listener.mockClear();
    reportSyncError('unavailable'); // 同じ値 → 変化なし
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe したリスナーは呼ばれない', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSyncError(listener);

    unsubscribe();
    reportSyncError('permission-denied');

    expect(listener).not.toHaveBeenCalled();
  });
});
