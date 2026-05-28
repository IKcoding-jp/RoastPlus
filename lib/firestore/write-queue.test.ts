import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppData, WorkProgress } from '@/types';

const firestoreMocks = vi.hoisted(() => {
  const deleteFieldSentinel = { __deleteField: true };
  const batch = {
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  };

  return {
    batch,
    deleteFieldSentinel,
    getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
    doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    collection: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { path };
    }),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    writeBatch: vi.fn(() => batch),
    deleteField: vi.fn(() => deleteFieldSentinel),
  };
});

vi.mock('../firebase', () => ({
  default: {},
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: firestoreMocks.getFirestore,
  doc: firestoreMocks.doc,
  collection: firestoreMocks.collection,
  getDocs: firestoreMocks.getDocs,
  setDoc: firestoreMocks.setDoc,
  writeBatch: firestoreMocks.writeBatch,
  deleteField: firestoreMocks.deleteField,
}));

const keepProgress: WorkProgress = {
  id: 'wp-keep',
  taskName: '残す進捗',
  status: 'in_progress',
  createdAt: '2026-05-20T00:00:00.000Z',
  updatedAt: '2026-05-21T00:00:00.000Z',
  completedCount: 1,
};

const deleteProgress: WorkProgress = {
  id: 'wp-delete',
  taskName: '削除済み進捗',
  status: 'pending',
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-05-19T00:00:00.000Z',
};

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    todaySchedules: [],
    roastSchedules: [],
    tastingSessions: [],
    tastingRecords: [],
    notifications: [],
    encouragementCount: 0,
    roastTimerRecords: [],
    workProgresses: [],
    dripRecipes: [],
    ...overrides,
  };
}

function querySnapshot(progresses: WorkProgress[]) {
  return {
    docs: progresses.map((progress) => ({
      id: progress.id,
      ref: { path: `users/user-1/workProgresses/${progress.id}` },
      data: () => progress,
    })),
  };
}

function rootWritePayloads() {
  const directWrites = firestoreMocks.setDoc.mock.calls
    .filter(([ref]) => ref.path === 'users/user-1')
    .map(([, data]) => data as Record<string, unknown>);
  const batchWrites = firestoreMocks.batch.set.mock.calls
    .filter(([ref]) => ref.path === 'users/user-1')
    .map(([, data]) => data as Record<string, unknown>);

  return [...directWrites, ...batchWrites];
}

async function flushSaveTimers(debounceMs: number) {
  await vi.advanceTimersByTimeAsync(debounceMs + 10_000);
}

describe('saveUserData workProgresses split writes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T00:00:00.000Z'));
    vi.clearAllMocks();
    firestoreMocks.getDocs.mockResolvedValue(querySnapshot([]));
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.batch.commit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const { clearWriteQueueStateForTests } = await import('./userData/write-queue');
    clearWriteQueueStateForTests();
    vi.useRealTimers();
  });

  it('workProgressesをサブコレクションへ保存し、root users/{uid}.workProgressesを増やさない', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        encouragementCount: 3,
        workProgresses: [keepProgress],
      }),
      { syncWorkProgresses: true }
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()).toHaveLength(1);
    expect(rootWritePayloads()[0]).toMatchObject({ encouragementCount: 3 });
    expect(rootWritePayloads()[0]).not.toHaveProperty('workProgresses');

    expect(firestoreMocks.batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-keep' }),
      expect.objectContaining({ id: 'wp-keep', taskName: '残す進捗' })
    );
    expect(firestoreMocks.batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/_meta/dataSplits' }),
      expect.objectContaining({ workProgressesMigrated: true }),
      { merge: true }
    );
  });

  it('既存root workProgressesを意図せず削除する書き込みをrootへ送らない', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData('user-1', appData({ workProgresses: [] }), { syncWorkProgresses: true });

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()).toHaveLength(1);
    expect(rootWritePayloads()[0]).not.toHaveProperty('workProgresses');
  });

  it('AppDataから削除されたworkProgressesをサブコレクション側から削除する', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([keepProgress, deleteProgress]));

    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData('user-1', appData({ workProgresses: [keepProgress] }), {
      syncWorkProgresses: true,
    });

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(firestoreMocks.batch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-delete' })
    );
    expect(firestoreMocks.batch.delete).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-keep' })
    );
  });

  it('関係ないAppDataフィールドのroot保存挙動を維持する', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        todaySchedules: [{ id: 'today-1', date: '2026-05-24', timeLabels: [] }],
        workProgresses: [],
      })
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()[0]).toMatchObject({
      todaySchedules: [{ id: 'today-1', date: '2026-05-24', timeLabels: [] }],
    });
  });

  it('更新対象外のtastingSessionsとtastingRecordsを空配列で上書きしない', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        encouragementCount: 9,
        tastingSessions: [],
        tastingRecords: [],
      }),
      { updatedFields: ['encouragementCount'] }
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()).toHaveLength(1);
    expect(rootWritePayloads()[0]).toEqual({ encouragementCount: 9 });
  });

  it('workProgresses未変更の保存ではサブコレクションを読み書きしない', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        encouragementCount: 8,
        workProgresses: [keepProgress],
      })
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()[0]).toMatchObject({ encouragementCount: 8 });
    expect(rootWritePayloads()[0]).not.toHaveProperty('workProgresses');
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
    expect(firestoreMocks.batch.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-keep' }),
      expect.anything(),
      expect.anything()
    );
  });

  it('既存サブコレクションdocと同じworkProgressは再setしない', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([keepProgress]));
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData('user-1', appData({ workProgresses: [keepProgress] }), {
      syncWorkProgresses: true,
    });

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(firestoreMocks.batch.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-keep' }),
      expect.anything(),
      expect.anything()
    );
  });

  it('workProgress docはmergeではなく置換し、消えたフィールドを残さない', async () => {
    const existingProgress: WorkProgress = {
      ...keepProgress,
      targetAmount: 10,
      currentAmount: 4,
      progressHistory: [{ id: 'history-1', date: '2026-05-21T00:00:00.000Z', amount: 4 }],
    };
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([existingProgress]));
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData('user-1', appData({ workProgresses: [keepProgress] }), {
      syncWorkProgresses: true,
    });

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(firestoreMocks.batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/workProgresses/wp-keep' }),
      expect.not.objectContaining({
        targetAmount: expect.anything(),
        currentAmount: expect.anything(),
        progressHistory: expect.anything(),
      })
    );
  });
});
