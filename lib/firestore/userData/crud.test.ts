// subscribeUserData の購読エラー通知・自動再購読のテスト（issue #496）

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeUserData } from './crud';
import { getSyncError, clearSyncError } from '@/lib/syncStatus';

const firestoreMocks = vi.hoisted(() => ({
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: firestoreMocks.onSnapshot,
}));

vi.mock('../common', () => ({
  getUserDocRef: vi.fn(() => ({ path: 'users/test-user' })),
  removeUndefinedFields: vi.fn((data: unknown) => data),
  normalizeAppData: vi.fn((data: unknown) => data),
  defaultData: { todaySchedules: [] },
}));

vi.mock('@/lib/e2eMode', () => ({
  isE2EMode: () => false,
  loadE2EAppData: vi.fn(),
  saveE2EAppData: vi.fn(),
}));

vi.mock('./write-queue', () => ({
  writeQueues: new Map(),
  SAVE_USER_DATA_DEBOUNCE_MS: 0,
  executeWrite: vi.fn(),
}));

type SnapshotHandler = (snapshot: { exists: () => boolean; data: () => unknown }) => void;
type ErrorHandler = (error: { code?: string }) => void;

// onSnapshot に渡されたハンドラを捕捉するヘルパー
function captureHandlers() {
  const captured: { onNext: SnapshotHandler[]; onError: ErrorHandler[]; unsubscribes: ReturnType<typeof vi.fn>[] } = {
    onNext: [],
    onError: [],
    unsubscribes: [],
  };
  firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: SnapshotHandler, onError: ErrorHandler) => {
    captured.onNext.push(onNext);
    captured.onError.push(onError);
    const unsubscribe = vi.fn();
    captured.unsubscribes.push(unsubscribe);
    return unsubscribe;
  });
  return captured;
}

describe('subscribeUserData の購読エラー処理', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    firestoreMocks.onSnapshot.mockReset();
    clearSyncError();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('購読エラー時に callback を呼ばず、同期エラーが報告される', () => {
    const captured = captureHandlers();
    const callback = vi.fn();
    subscribeUserData('test-user', callback);

    captured.onError[0]({ code: 'internal' });

    expect(callback).not.toHaveBeenCalled();
    expect(getSyncError()).toBe('unknown');
  });

  it('permission-denied エラーは種別 permission-denied として報告される', () => {
    const captured = captureHandlers();
    subscribeUserData('test-user', vi.fn());

    captured.onError[0]({ code: 'permission-denied' });

    expect(getSyncError()).toBe('permission-denied');
  });

  it('unavailable エラーは種別 unavailable として報告される', () => {
    const captured = captureHandlers();
    subscribeUserData('test-user', vi.fn());

    captured.onError[0]({ code: 'unavailable' });

    expect(getSyncError()).toBe('unavailable');
  });

  it('エラー後にスナップショットを受信できたら同期エラーが解除される', () => {
    const captured = captureHandlers();
    const callback = vi.fn();
    subscribeUserData('test-user', callback);

    captured.onError[0]({ code: 'unavailable' });
    expect(getSyncError()).toBe('unavailable');

    // バックオフ経過後に再購読され、その購読でスナップショット成功
    vi.advanceTimersByTime(1000);
    expect(captured.onNext.length).toBeGreaterThanOrEqual(2);
    captured.onNext[1]({ exists: () => true, data: () => ({ todaySchedules: [] }) });

    expect(getSyncError()).toBeNull();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('購読エラー後、バックオフ付きで自動的に再購読される', () => {
    const captured = captureHandlers();
    subscribeUserData('test-user', vi.fn());
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);

    // 1回目のエラー → 1秒後に再購読
    captured.onError[0]({ code: 'unavailable' });
    vi.advanceTimersByTime(999);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(2);

    // 2回目のエラー → 2秒後に再購読（指数バックオフ）
    captured.onError[1]({ code: 'unavailable' });
    vi.advanceTimersByTime(1999);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(3);
  });

  it('unsubscribe 後は再購読されず、進行中のリトライもキャンセルされる', () => {
    const captured = captureHandlers();
    const unsubscribe = subscribeUserData('test-user', vi.fn());

    captured.onError[0]({ code: 'unavailable' });
    unsubscribe();

    vi.advanceTimersByTime(60_000);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);
    expect(captured.unsubscribes[0]).toHaveBeenCalled();
  });

  it('unsubscribe 時に同期エラーが解除される（ログアウト後の古いバナー防止）', () => {
    const captured = captureHandlers();
    const unsubscribe = subscribeUserData('test-user', vi.fn());

    captured.onError[0]({ code: 'unavailable' });
    expect(getSyncError()).toBe('unavailable');

    unsubscribe();

    expect(getSyncError()).toBeNull();
  });

  it('同一購読でエラーが連続しても、リトライタイマーは1つだけ保持される', () => {
    const captured = captureHandlers();
    subscribeUserData('test-user', vi.fn());

    // 同じ購読世代でエラーが2回発火（前のタイマーは破棄されるべき）
    captured.onError[0]({ code: 'unavailable' });
    captured.onError[0]({ code: 'unavailable' });

    vi.advanceTimersByTime(60_000);
    // 再購読は1回だけ（初回購読1 + 再購読1 = 2）
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(2);
  });

  it('スナップショット成功でバックオフがリセットされる', () => {
    const captured = captureHandlers();
    subscribeUserData('test-user', vi.fn());

    // エラー → 再購読 → 成功 → 再びエラー
    captured.onError[0]({ code: 'unavailable' });
    vi.advanceTimersByTime(1000);
    captured.onNext[1]({ exists: () => true, data: () => ({ todaySchedules: [] }) });
    captured.onError[1]({ code: 'unavailable' });

    // リセットされていれば再購読まで1秒（2秒ではない）
    vi.advanceTimersByTime(1000);
    expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(3);
  });
});
