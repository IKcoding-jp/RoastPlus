// iOS PWA復帰後のFirestoreゾンビ接続対策: 接続再確立のテスト

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconnectFirestoreNetwork } from './reconnect';
import { getSyncError, clearSyncError } from '@/lib/syncStatus';

const firestoreMocks = vi.hoisted(() => ({
  disableNetwork: vi.fn(),
  enableNetwork: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  disableNetwork: firestoreMocks.disableNetwork,
  enableNetwork: firestoreMocks.enableNetwork,
}));

vi.mock('@/lib/firebase', () => ({
  db: { type: 'mock-firestore' },
}));

describe('reconnectFirestoreNetwork', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    firestoreMocks.disableNetwork.mockReset().mockResolvedValue(undefined);
    firestoreMocks.enableNetwork.mockReset().mockResolvedValue(undefined);
    clearSyncError();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disableNetwork → enableNetwork の順で接続を張り直す', async () => {
    const callOrder: string[] = [];
    firestoreMocks.disableNetwork.mockImplementation(async () => {
      callOrder.push('disable');
    });
    firestoreMocks.enableNetwork.mockImplementation(async () => {
      callOrder.push('enable');
    });

    await reconnectFirestoreNetwork();

    expect(callOrder).toEqual(['disable', 'enable']);
  });

  it('実行中の二重呼び出しは無視する（single-flight）', async () => {
    let resolveDisable: () => void = () => {};
    firestoreMocks.disableNetwork.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDisable = resolve;
        })
    );

    const first = reconnectFirestoreNetwork();
    const second = reconnectFirestoreNetwork();
    resolveDisable();
    await Promise.all([first, second]);

    expect(firestoreMocks.disableNetwork).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.enableNetwork).toHaveBeenCalledTimes(1);
  });

  it('disableNetwork が失敗しても enableNetwork は実行する（接続復元を優先）', async () => {
    firestoreMocks.disableNetwork.mockRejectedValue(new Error('disable failed'));

    await reconnectFirestoreNetwork();

    expect(firestoreMocks.enableNetwork).toHaveBeenCalledTimes(1);
  });

  it('enableNetwork が失敗したら同期エラーとしてユーザーに通知する', async () => {
    firestoreMocks.enableNetwork.mockRejectedValue({ code: 'unavailable' });

    await reconnectFirestoreNetwork();

    expect(getSyncError()).toBe('unavailable');
  });

  it('完了後は再度呼び出せる', async () => {
    await reconnectFirestoreNetwork();
    await reconnectFirestoreNetwork();

    expect(firestoreMocks.disableNetwork).toHaveBeenCalledTimes(2);
    expect(firestoreMocks.enableNetwork).toHaveBeenCalledTimes(2);
  });
});
