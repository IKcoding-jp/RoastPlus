// Firestore購読エラー（issue #496）・保存エラー（issue #497）の同期状態ストアのテスト

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSyncError,
  reportSyncError,
  clearSyncError,
  subscribeSyncError,
  getSaveError,
  reportSaveError,
  clearSaveError,
  toSyncErrorType,
} from './syncStatus';

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

describe('saveError（保存エラーチャンネル・issue #497）', () => {
  beforeEach(() => {
    clearSyncError();
    clearSaveError();
  });

  it('初期状態では保存エラーがない（null）', () => {
    expect(getSaveError()).toBeNull();
  });

  it('reportSaveError で報告したエラー種別を取得できる', () => {
    reportSaveError('permission-denied');
    expect(getSaveError()).toBe('permission-denied');
  });

  it('reportSaveError で購読中のリスナーが呼ばれる（subscribeSyncError を共用）', () => {
    const listener = vi.fn();
    subscribeSyncError(listener);

    reportSaveError('unknown');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clearSaveError で保存エラーが消えてリスナーが呼ばれる', () => {
    const listener = vi.fn();
    reportSaveError('unknown');
    subscribeSyncError(listener);

    clearSaveError();

    expect(getSaveError()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('保存エラーと購読エラーは独立して管理される', () => {
    reportSaveError('unknown');
    expect(getSyncError()).toBeNull();

    reportSyncError('unavailable');
    clearSyncError();
    // 購読エラーをクリアしても保存エラーは残る
    expect(getSaveError()).toBe('unknown');

    clearSaveError();
    reportSyncError('unavailable');
    // 保存エラーをクリアしても購読エラーは残る
    expect(getSyncError()).toBe('unavailable');
  });

  it('状態が変化しないときはリスナーを呼ばない（不要な再レンダー防止）', () => {
    const listener = vi.fn();
    subscribeSyncError(listener);

    clearSaveError(); // すでに null → 変化なし
    expect(listener).not.toHaveBeenCalled();

    reportSaveError('unknown');
    listener.mockClear();
    reportSaveError('unknown'); // 同じ値 → 変化なし
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('toSyncErrorType（エラーコード分類・購読/保存で共用）', () => {
  it('permission-denied をそのまま分類する', () => {
    expect(toSyncErrorType({ code: 'permission-denied' })).toBe('permission-denied');
  });

  it('unavailable をそのまま分類する', () => {
    expect(toSyncErrorType({ code: 'unavailable' })).toBe('unavailable');
  });

  it('未知のコードや code なしは unknown に分類する', () => {
    expect(toSyncErrorType({ code: 'resource-exhausted' })).toBe('unknown');
    expect(toSyncErrorType({})).toBe('unknown');
  });
});
