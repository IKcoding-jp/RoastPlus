import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppData } from '@/types';

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

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    todaySchedules: [],
    roastSchedules: [],
    tastingSessions: [],
    tastingRecords: [],
    notifications: [],
    encouragementCount: 0,
    roastTimerRecords: [],
    dripRecipes: [],
    ...overrides,
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

describe('saveUserData root write behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T00:00:00.000Z'));
    vi.clearAllMocks();
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.batch.commit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const { clearWriteQueueStateForTests } = await import('./userData/write-queue');
    clearWriteQueueStateForTests();
    vi.useRealTimers();
  });

  it('関係ないAppDataフィールドのroot保存挙動を維持する', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        todaySchedules: [{ id: 'today-1', date: '2026-05-24', timeLabels: [] }],
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
});
