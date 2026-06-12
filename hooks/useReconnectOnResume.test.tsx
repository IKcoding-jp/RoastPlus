// iOS PWA復帰時にFirestore接続を張り直すフックのテスト

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReconnectOnResume, RECONNECT_HIDDEN_THRESHOLD_MS } from './useReconnectOnResume';

const reconnectMocks = vi.hoisted(() => ({
  reconnectFirestoreNetwork: vi.fn(),
}));

vi.mock('@/lib/firestore/reconnect', () => ({
  reconnectFirestoreNetwork: reconnectMocks.reconnectFirestoreNetwork,
}));

vi.mock('@/lib/e2eMode', () => ({
  isE2EMode: () => false,
}));

function setVisibilityState(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
}

describe('useReconnectOnResume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reconnectMocks.reconnectFirestoreNetwork.mockReset().mockResolvedValue(undefined);
    setVisibilityState('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibilityState('visible');
  });

  it('しきい値以上バックグラウンドにいた後の復帰で再接続する', () => {
    renderHook(() => useReconnectOnResume());

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(RECONNECT_HIDDEN_THRESHOLD_MS);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(reconnectMocks.reconnectFirestoreNetwork).toHaveBeenCalledTimes(1);
  });

  it('しきい値未満の短いバックグラウンドでは再接続しない（タブ切替程度で接続を壊さない）', () => {
    renderHook(() => useReconnectOnResume());

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(RECONNECT_HIDDEN_THRESHOLD_MS - 1000);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(reconnectMocks.reconnectFirestoreNetwork).not.toHaveBeenCalled();
  });

  it('hidden を経ずに visibilitychange が発火しても再接続しない', () => {
    renderHook(() => useReconnectOnResume());

    document.dispatchEvent(new Event('visibilitychange'));

    expect(reconnectMocks.reconnectFirestoreNetwork).not.toHaveBeenCalled();
  });

  it('pageshow（bfcache復元）では経過時間に関係なく再接続する', () => {
    renderHook(() => useReconnectOnResume());

    const pageshowEvent = new Event('pageshow');
    Object.defineProperty(pageshowEvent, 'persisted', { value: true });
    window.dispatchEvent(pageshowEvent);

    expect(reconnectMocks.reconnectFirestoreNetwork).toHaveBeenCalledTimes(1);
  });

  it('pageshow（通常の読み込み）では再接続しない', () => {
    renderHook(() => useReconnectOnResume());

    const pageshowEvent = new Event('pageshow');
    Object.defineProperty(pageshowEvent, 'persisted', { value: false });
    window.dispatchEvent(pageshowEvent);

    expect(reconnectMocks.reconnectFirestoreNetwork).not.toHaveBeenCalled();
  });

  it('アンマウント後はイベントが発火しても再接続しない', () => {
    const { unmount } = renderHook(() => useReconnectOnResume());

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(RECONNECT_HIDDEN_THRESHOLD_MS);

    unmount();

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(reconnectMocks.reconnectFirestoreNetwork).not.toHaveBeenCalled();
  });
});
