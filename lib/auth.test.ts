import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from 'firebase/auth';

import { useAuth, AUTH_INIT_TIMEOUT_MS } from './auth';

// onAuthStateChanged に渡されたコールバックを手動発火できるよう保持する
const listeners = vi.hoisted(() => ({
  next: null as ((user: User | null) => void) | null,
  error: null as ((error: unknown) => void) | null,
  unsubscribe: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, next: (user: User | null) => void, error?: (error: unknown) => void) => {
    listeners.next = next;
    listeners.error = error ?? null;
    return listeners.unsubscribe;
  },
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  clearIndexedDbPersistence: vi.fn(),
  terminate: vi.fn(),
  waitForPendingWrites: vi.fn(),
}));

vi.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('@/lib/firestore', () => ({
  flushPendingUserDataWrites: vi.fn(),
}));

vi.mock('./e2eMode', () => ({
  isE2EMode: () => false,
  isE2ESignedIn: () => false,
  getE2EUser: () => null,
  signOutE2EUser: vi.fn(),
}));

const mockUser = { uid: 'test-user-id', email: 'test@example.com' } as unknown as User;

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listeners.next = null;
    listeners.error = null;
    listeners.unsubscribe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('onAuthStateChanged が user を伴って発火すると loading が解除され user がセットされる', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    act(() => {
      listeners.next?.(mockUser);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(mockUser);
  });

  it('初回コールバックが来なくても AUTH_INIT_TIMEOUT_MS 経過で loading が解除される', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(AUTH_INIT_TIMEOUT_MS);
    });

    // 全画面が「読み込み中」で固まらないことを保証する核となるケース
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('タイムアウト後に遅れて認証状態が確定したら user が更新される', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(AUTH_INIT_TIMEOUT_MS);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();

    // リスナーは貼ったままなので、後から確定した user を反映できる
    act(() => {
      listeners.next?.(mockUser);
    });
    expect(result.current.user).toBe(mockUser);
  });

  it('onError 発火でも loading が解除される', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuth());

    act(() => {
      listeners.error?.(new Error('auth init failed'));
    });

    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  it('アンマウント時にリスナーを解除する', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(listeners.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
