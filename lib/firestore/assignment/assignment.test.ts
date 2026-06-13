import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: mocks.getAuth,
}));

vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  setDoc: mocks.setDoc,
  serverTimestamp: mocks.serverTimestamp,
  where: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

import { getServerTodayDate } from './assignment';

describe('getServerTodayDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-23T10:00:00.000Z'));
    mocks.getAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
    mocks.doc.mockReturnValue({ path: 'users/user-1/_meta/serverTime' });
    mocks.serverTimestamp.mockReturnValue('server-timestamp');
    mocks.getDoc.mockResolvedValue({
      data: () => ({ now: { toDate: () => new Date('2026-05-23T01:00:00.000Z') } }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Firestore書き込み権限がなくてもローカル日付を返す', async () => {
    mocks.setDoc.mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(getServerTodayDate()).resolves.toBe('2026-05-23');
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });
});
